-- Add preferred delivery time columns to users table
ALTER TABLE public.users
  ADD COLUMN preferred_hour INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN preferred_minute INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.users
  ADD CONSTRAINT chk_preferred_hour CHECK (preferred_hour >= 0 AND preferred_hour <= 23),
  ADD CONSTRAINT chk_preferred_minute CHECK (preferred_minute IN (0, 15, 30, 45));
