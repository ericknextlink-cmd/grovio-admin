-- Discount vouchers: admin creates with unique code; users get them assigned or global.
-- Run in Supabase SQL editor.
-- Backend validates code at checkout and applies discount server-side so amount cannot be manipulated.

CREATE TABLE IF NOT EXISTS discount_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value > 0),
  description TEXT,
  image_type TEXT CHECK (image_type IN ('regular', 'nss')),
  min_order_amount NUMERIC(12,2) DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  max_uses INT,
  use_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  voucher_id UUID NOT NULL REFERENCES discount_vouchers(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, voucher_id)
);

CREATE INDEX IF NOT EXISTS idx_discount_vouchers_code ON discount_vouchers(code);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_user ON user_vouchers(user_id);

COMMENT ON TABLE discount_vouchers IS 'Voucher definitions; admin creates with unique code. image_type: regular or nss for which image to send.';
COMMENT ON TABLE user_vouchers IS 'Vouchers assigned to users; used_at set when applied at checkout.';
