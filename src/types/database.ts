export interface User {
  id: string;
  auth_user_id: string;
  email: string;
  user_name: string | null;
  phone: string | null;
  chat_id: string | null;
  google_refresh_token: string | null;
  timezone: string;
  preferred_hour: number;
  preferred_minute: number;
  selected_calendar_ids: string[] | null;
  last_sent_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserInsert {
  auth_user_id: string;
  email: string;
  user_name?: string | null;
  phone?: string | null;
  chat_id?: string | null;
  google_refresh_token?: string | null;
  timezone?: string;
  selected_calendar_ids?: string[] | null;
  active?: boolean;
}

export interface UserUpdate {
  phone?: string | null;
  chat_id?: string | null;
  google_refresh_token?: string | null;
  timezone?: string;
  preferred_hour?: number;
  preferred_minute?: number;
  selected_calendar_ids?: string[] | null;
  last_sent_at?: string | null;
  active?: boolean;
  user_name?: string | null;
}

export interface MessageLog {
  id: string;
  user_id: string;
  sent_at: string;
  scenario: string;
  events_count: number;
  message_preview: string | null;
  delivery_status: string;
  error_message: string | null;
  created_at: string;
}

export interface MessageLogInsert {
  user_id: string;
  sent_at: string;
  scenario: string;
  events_count: number;
  message_preview?: string | null;
  delivery_status: string;
  error_message?: string | null;
}
