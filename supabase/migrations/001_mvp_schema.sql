-- Clean slate: drop old tables if they exist (order matters due to FK)
DROP TABLE IF EXISTS public.message_log;
DROP TABLE IF EXISTS public.users;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- Users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_name TEXT,
  phone TEXT,
  chat_id TEXT,
  google_refresh_token TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Bucharest',
  selected_calendar_ids JSONB,
  last_sent_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Message log table
CREATE TABLE public.message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL,
  scenario TEXT NOT NULL,
  events_count INTEGER NOT NULL DEFAULT 0,
  message_preview TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX idx_message_log_user_id ON public.message_log(user_id);
CREATE INDEX idx_message_log_sent_at ON public.message_log(sent_at);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own row
CREATE POLICY "Users can read own row" ON public.users
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Users can update their own row
CREATE POLICY "Users can update own row" ON public.users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Service role can do everything (bypasses RLS automatically)
-- Users can read their own message logs
CREATE POLICY "Users can read own logs" ON public.message_log
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );
