-- Scheduled re-orders for bundled products. Run this in Supabase SQL editor if the table does not exist.
-- When Resend is configured, a cron or daily job can send reminders 1 day before scheduled_at.

CREATE TABLE IF NOT EXISTS scheduled_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bundle_id TEXT NOT NULL,
  bundle_title TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'weekly' CHECK (recurrence IN ('weekly', 'biweekly', 'monthly', 'custom_days')),
  custom_days INT,
  reminder_sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'ordered_now')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_orders_user ON scheduled_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_orders_scheduled_at ON scheduled_orders(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_orders_status ON scheduled_orders(status);

COMMENT ON TABLE scheduled_orders IS 'User scheduled re-orders for bundles; reminder email sent 1 day before scheduled_at when RESEND_API_KEY is set.';
