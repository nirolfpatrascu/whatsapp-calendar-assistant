-- 001_initial_schema.sql
-- WhatsApp Daily Calendar Assistant — Full database schema

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  user_name                 TEXT NOT NULL DEFAULT '',
  email                     TEXT NOT NULL,
  phone                     TEXT,
  chat_id                   TEXT,

  -- Google Calendar
  google_refresh_token      TEXT,
  selected_calendar_ids     JSONB DEFAULT '[]'::jsonb,

  -- Preferences
  timezone                  TEXT DEFAULT 'UTC',
  send_hour                 TEXT DEFAULT '08:00',
  prefs_last_updated_at     TIMESTAMPTZ,
  prefs_change_count_today  INTEGER DEFAULT 0,
  prefs_change_date         DATE,

  -- Order / Onboarding
  order_id                  INTEGER UNIQUE,
  order_token               TEXT UNIQUE NOT NULL,
  order_token_status        TEXT DEFAULT 'new'
                            CHECK (order_token_status IN ('new', 'used', 'expired')),
  onboarding_status         TEXT DEFAULT 'pending'
                            CHECK (onboarding_status IN ('pending', 'complete')),
  onboarding_last_email_at  TIMESTAMPTZ,

  -- Delivery tracking
  last_sent_date            DATE,
  last_sent_at              TIMESTAMPTZ,

  -- Status
  active                    BOOLEAN DEFAULT true,
  notes                     TEXT,

  -- Timestamps
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MESSAGE LOG TABLE (NEW — delivery tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS message_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sent_at           TIMESTAMPTZ DEFAULT now(),
  scenario          TEXT CHECK (scenario IN ('empty', 'normal', 'overlap', 'free_block')),
  events_count      INTEGER,
  message_preview   TEXT,
  delivery_status   TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'failed', 'skipped')),
  error_message     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_customers_order_token ON customers(order_token);
CREATE INDEX idx_customers_order_id ON customers(order_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_onboarding_status ON customers(onboarding_status);
CREATE INDEX idx_customers_active ON customers(active);
CREATE INDEX idx_customers_send_hour ON customers(send_hour);
CREATE INDEX idx_customers_last_sent_date ON customers(last_sent_date);

CREATE INDEX idx_message_log_customer_id ON message_log(customer_id);
CREATE INDEX idx_message_log_sent_at ON message_log(sent_at);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (service role only — no public access)
-- ============================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS by default.
-- No public policies = no public access.
