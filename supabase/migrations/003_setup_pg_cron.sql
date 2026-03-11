-- ============================================================
-- Enable pg_cron and pg_net extensions
-- NOTE: These must ALSO be enabled via Supabase Dashboard:
--   Database → Extensions → search "pg_cron" → Enable
--   Database → Extensions → search "pg_net"  → Enable
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage so cron can use pg_net
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ============================================================
-- Schedule: every 15 minutes, call /api/cron/send-agendas
-- IMPORTANT: Replace YOUR_CRON_SECRET below with your actual
-- CRON_SECRET value (the same one in your Vercel env vars)
-- ============================================================

SELECT cron.schedule(
  'send-agendas-every-15-min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://whatsapp-calendar-assistant-five.vercel.app/api/cron/send-agendas',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- To verify it was created:
-- SELECT * FROM cron.job;

-- To remove if needed:
-- SELECT cron.unschedule('send-agendas-every-15-min');
