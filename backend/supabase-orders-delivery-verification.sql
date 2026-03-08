-- Add delivery verification fields to orders for rider/customer confirmation.
-- Run this in Supabase SQL editor if the columns do not exist.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_code text,
  ADD COLUMN IF NOT EXISTS delivery_verification_token text;

-- Index for fast lookup by code (active orders only; delivered/cancelled can reuse codes)
CREATE INDEX IF NOT EXISTS idx_orders_delivery_code_active
  ON orders (delivery_code)
  WHERE status NOT IN ('delivered', 'cancelled') AND delivery_code IS NOT NULL;

-- Unique index on token so each token maps to one order (token is one-time use for verification)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_delivery_verification_token
  ON orders (delivery_verification_token)
  WHERE delivery_verification_token IS NOT NULL;

COMMENT ON COLUMN orders.delivery_code IS '4-digit code shown to customer; rider enters to confirm delivery. Unique among non-delivered/non-cancelled orders.';
COMMENT ON COLUMN orders.delivery_verification_token IS 'Secret token for QR-based delivery verification; rider scans QR to confirm.';
