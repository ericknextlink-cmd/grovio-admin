-- Cron job lock table: prevents concurrent runs of the same job (e.g. scheduled order reminders).
-- Run this in Supabase SQL editor once.

CREATE TABLE IF NOT EXISTS cron_locks (
  job_name TEXT PRIMARY KEY,
  locked_until TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE cron_locks IS 'Locks for cron jobs; backend acquires before run and releases after. locked_until prevents overlap.';
