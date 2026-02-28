-- Persist pricing page markup percentages so they load on refresh.
-- Run in Supabase SQL Editor. Table: pricing_range_settings (range_id = 0-10, 10-50, 50-100, 100-500, 500+)

CREATE TABLE IF NOT EXISTS pricing_range_settings (
  range_id TEXT PRIMARY KEY,
  percentage NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default range ids so we can upsert
INSERT INTO pricing_range_settings (range_id, percentage)
VALUES
  ('0-10', 0),
  ('10-50', 0),
  ('50-100', 0),
  ('100-500', 0),
  ('500+', 0)
ON CONFLICT (range_id) DO NOTHING;
