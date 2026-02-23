import { createSupabaseAdmin } from './client';
import type {
  Customer,
  CustomerInsert,
  CustomerUpdate,
  MessageLogInsert,
} from '@/types/database';

// ============================================================
// CUSTOMER — CREATE
// ============================================================

export async function createCustomer(
  data: CustomerInsert
): Promise<Customer | null> {
  const supabase = createSupabaseAdmin();

  // ON CONFLICT(order_id) DO NOTHING — idempotency for duplicate webhooks
  const { data: customer, error } = await supabase
    .from('customers')
    .upsert(
      {
        user_name: data.user_name,
        email: data.email,
        order_id: data.order_id,
        order_token: data.order_token,
        order_token_status: data.order_token_status ?? 'new',
        onboarding_status: data.onboarding_status ?? 'pending',
        active: data.active ?? true,
      },
      { onConflict: 'order_id', ignoreDuplicates: true }
    )
    .select()
    .single();

  if (error) {
    // If the upsert returned no rows (duplicate ignored), that's not an error
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return customer as Customer;
}

// ============================================================
// CUSTOMER — READ
// ============================================================

export async function getCustomerByToken(
  orderToken: string
): Promise<Customer | null> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('order_token', orderToken)
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as Customer;
}

export async function getCustomerByAuthUserId(
  authUserId: string
): Promise<Customer | null> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', authUserId)
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as Customer;
}

export async function getCustomerById(
  id: string
): Promise<Customer | null> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as Customer;
}

// ============================================================
// CUSTOMER — UPDATE
// ============================================================

export async function updateCustomer(
  id: string,
  updates: CustomerUpdate
): Promise<Customer | null> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return data as Customer;
}

export async function completeOnboarding(
  orderToken: string,
  data: {
    phone: string;
    chat_id: string;
    google_refresh_token: string;
    send_hour: string;
    timezone: string;
    auth_user_id: string;
  }
): Promise<Customer | null> {
  const supabase = createSupabaseAdmin();

  const { data: customer, error } = await supabase
    .from('customers')
    .update({
      phone: data.phone,
      chat_id: data.chat_id,
      google_refresh_token: data.google_refresh_token,
      send_hour: data.send_hour,
      timezone: data.timezone,
      auth_user_id: data.auth_user_id,
      onboarding_status: 'complete',
      order_token_status: 'used',
      onboarding_last_email_at: new Date().toISOString(),
    })
    .eq('order_token', orderToken)
    .select()
    .single();

  if (error) throw error;

  return customer as Customer;
}

// ============================================================
// CUSTOMER — PREFERENCES
// ============================================================

export async function updatePreferences(
  customerId: string,
  data: {
    selected_calendar_ids: string[];
    send_hour: string;
    timezone: string;
    user_name?: string;
    prefs_change_count_today: number;
  }
): Promise<Customer | null> {
  const supabase = createSupabaseAdmin();

  const updates: CustomerUpdate = {
    selected_calendar_ids: data.selected_calendar_ids,
    send_hour: data.send_hour,
    timezone: data.timezone,
    prefs_last_updated_at: new Date().toISOString(),
    prefs_change_count_today: data.prefs_change_count_today,
    prefs_change_date: new Date().toISOString().split('T')[0],
  };

  if (data.user_name) {
    updates.user_name = data.user_name;
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', customerId)
    .select()
    .single();

  if (error) throw error;

  return customer as Customer;
}

export function checkAntiFlood(customer: Customer): {
  canUpdate: boolean;
  reason?: string;
} {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Reset counter if new day
  const countToday =
    customer.prefs_change_date === today
      ? customer.prefs_change_count_today
      : 0;

  // Check frequency: 1-minute minimum between changes
  if (customer.prefs_last_updated_at) {
    const lastUpdate = new Date(customer.prefs_last_updated_at);
    const diffMs = now.getTime() - lastUpdate.getTime();
    if (diffMs < 60000) {
      return { canUpdate: false, reason: 'too_frequent' };
    }
  }

  // Check daily cap: 20 changes per day
  if (countToday >= 20) {
    return { canUpdate: false, reason: 'daily_limit' };
  }

  return { canUpdate: true };
}

// ============================================================
// CUSTOMER — CRON QUERIES
// ============================================================

export async function getDueUsers(): Promise<Customer[]> {
  const supabase = createSupabaseAdmin();

  // Get all active, onboarded users with valid Google tokens
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('active', true)
    .eq('onboarding_status', 'complete')
    .not('google_refresh_token', 'is', null)
    .not('chat_id', 'is', null);

  if (error) throw error;

  return (data ?? []) as Customer[];
}

export async function getPendingOnboardingUsers(): Promise<Customer[]> {
  const supabase = createSupabaseAdmin();

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .neq('onboarding_status', 'complete')
    .neq('email', '')
    .or(
      `onboarding_last_email_at.is.null,onboarding_last_email_at.lt.${twoDaysAgo.toISOString()}`
    );

  if (error) throw error;

  return (data ?? []) as Customer[];
}

export async function updateLastSent(customerId: string): Promise<void> {
  const supabase = createSupabaseAdmin();

  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('customers')
    .update({
      last_sent_date: today,
      last_sent_at: new Date().toISOString(),
    })
    .eq('id', customerId);

  if (error) throw error;
}

export async function updateOnboardingEmailTimestamp(
  customerId: string
): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('customers')
    .update({
      onboarding_last_email_at: new Date().toISOString(),
    })
    .eq('id', customerId);

  if (error) throw error;
}

export async function deactivateCustomer(customerId: string): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('customers')
    .update({ active: false })
    .eq('id', customerId);

  if (error) throw error;
}

// ============================================================
// MESSAGE LOG
// ============================================================

export async function createMessageLog(
  log: MessageLogInsert
): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase.from('message_log').insert(log);

  if (error) throw error;
}
