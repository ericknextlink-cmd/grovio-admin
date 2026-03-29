-- Recurring vouchers: show expiry on the voucher image; valid_until is the last usable day.
-- One-time vouchers: no dates on the image (single-use semantics; max_uses often 1).
-- Run in Supabase SQL editor after discount_vouchers exists.

ALTER TABLE discount_vouchers
ADD COLUMN IF NOT EXISTS usage_type TEXT NOT NULL DEFAULT 'recurring'
  CHECK (usage_type IN ('recurring', 'one_time'));

COMMENT ON COLUMN discount_vouchers.usage_type IS 'recurring: show expiry date on voucher art; one_time: no dates on image';
