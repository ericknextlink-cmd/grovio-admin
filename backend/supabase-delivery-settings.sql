-- Platform delivery settings: warehouse location and price per km for delivery fee calculation.
-- Run in Supabase SQL editor if the table does not exist.

CREATE TABLE IF NOT EXISTS delivery_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_lat double precision,
  warehouse_lng double precision,
  warehouse_address text,
  price_per_km numeric(10, 2) NOT NULL DEFAULT 0,
  price_per_meter numeric(12, 4),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Single row: use id as constant or upsert by id.
INSERT INTO delivery_settings (id, price_per_km, warehouse_address)
VALUES ('a0000000-0000-0000-0000-000000000001'::uuid, 0, 'Not set')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE delivery_settings IS 'Platform warehouse location and delivery rate; used to calculate delivery fee from distance.';

-- Add delivery_fee to pending_orders and orders (run if columns do not exist)
ALTER TABLE pending_orders ADD COLUMN IF NOT EXISTS delivery_fee numeric(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee numeric(10, 2) DEFAULT 0;
