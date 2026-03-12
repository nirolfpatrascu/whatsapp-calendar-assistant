-- Add agenda_mode column to let users choose between
-- receiving tomorrow's agenda (evening) or today's agenda (morning)
ALTER TABLE users
  ADD COLUMN agenda_mode TEXT NOT NULL DEFAULT 'tomorrow'
  CHECK (agenda_mode IN ('today', 'tomorrow'));
