-- 002_add_auth_user_id.sql
-- Add Supabase Auth user ID to customers table for Google OAuth integration

-- ============================================================
-- ADD auth_user_id COLUMN
-- ============================================================
ALTER TABLE customers
  ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id);

CREATE INDEX idx_customers_auth_user_id ON customers(auth_user_id);

-- ============================================================
-- RLS POLICIES FOR AUTHENTICATED USERS
-- ============================================================

-- Authenticated users can read their own customer record
CREATE POLICY customers_select_own ON customers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Authenticated users can update their own customer record
CREATE POLICY customers_update_own ON customers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Service role bypasses RLS by default — no additional policy needed
-- for cron jobs, webhooks, and admin operations.
