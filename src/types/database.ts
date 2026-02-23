// ============================================================
// CUSTOMERS
// ============================================================

export interface Customer {
  id: string;
  user_name: string;
  email: string;
  phone: string | null;
  chat_id: string | null;
  google_refresh_token: string | null;
  selected_calendar_ids: string[];
  timezone: string;
  send_hour: string;
  prefs_last_updated_at: string | null;
  prefs_change_count_today: number;
  prefs_change_date: string | null;
  order_id: number | null;
  order_token: string;
  order_token_status: 'new' | 'used' | 'expired';
  onboarding_status: 'pending' | 'complete';
  onboarding_last_email_at: string | null;
  last_sent_date: string | null;
  last_sent_at: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerInsert {
  user_name: string;
  email: string;
  order_id: number;
  order_token: string;
  order_token_status?: 'new' | 'used' | 'expired';
  onboarding_status?: 'pending' | 'complete';
  active?: boolean;
}

export interface CustomerUpdate {
  user_name?: string;
  email?: string;
  phone?: string | null;
  chat_id?: string | null;
  google_refresh_token?: string | null;
  selected_calendar_ids?: string[];
  timezone?: string;
  send_hour?: string;
  prefs_last_updated_at?: string | null;
  prefs_change_count_today?: number;
  prefs_change_date?: string | null;
  order_token_status?: 'new' | 'used' | 'expired';
  onboarding_status?: 'pending' | 'complete';
  onboarding_last_email_at?: string | null;
  last_sent_date?: string | null;
  last_sent_at?: string | null;
  active?: boolean;
  notes?: string | null;
}

// ============================================================
// MESSAGE LOG
// ============================================================

export type MessageScenario = 'empty' | 'normal' | 'overlap' | 'free_block';
export type DeliveryStatus = 'sent' | 'failed' | 'skipped';

export interface MessageLog {
  id: string;
  customer_id: string;
  sent_at: string;
  scenario: MessageScenario | null;
  events_count: number | null;
  message_preview: string | null;
  delivery_status: DeliveryStatus;
  error_message: string | null;
  created_at: string;
}

export interface MessageLogInsert {
  customer_id: string;
  scenario: MessageScenario | null;
  events_count: number | null;
  message_preview: string | null;
  delivery_status: DeliveryStatus;
  error_message?: string | null;
}
