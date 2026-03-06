-- Fix: allow payment_method values used by verify-payment (Paystack channel + 'paystack' fallback).
-- Error was: new row for relation "orders" violates check constraint "orders_payment_method_check"
-- Run in Supabase SQL editor.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN (
    'paystack',
    'card',
    'mobile_money',
    'bank_transfer',
    'bank',
    'ussd',
    'qr',
    'eft',
    'unknown'
  ));

COMMENT ON COLUMN orders.payment_method IS 'Payment method: Paystack channel (card, mobile_money, etc.) or paystack when channel not mapped.';
