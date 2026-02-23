import { createSupabaseServer } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/client';
import type { Customer } from '@/types/database';

/**
 * Reads the current Supabase Auth session from cookies, then looks up
 * the corresponding customer record by `auth_user_id`.
 *
 * Returns the customer or null if no session / no linked customer.
 */
export async function getAuthenticatedCustomer(): Promise<Customer | null> {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  // Use admin client so the query isn't restricted by RLS
  // (the session-based client would also work here thanks to the
  //  RLS policy, but admin avoids edge cases during the linking step)
  const admin = createSupabaseAdmin();

  const { data: customer, error } = await admin
    .from('customers')
    .select('*')
    .eq('auth_user_id', user.id)
    .limit(1)
    .single();

  if (error) {
    // PGRST116 = no rows found — not an error for our purposes
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return customer as Customer;
}
