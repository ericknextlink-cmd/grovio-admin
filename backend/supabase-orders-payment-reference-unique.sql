-- Optional: enforce one order per payment reference at DB level.
-- Only run if you do NOT already have duplicate payment_reference values in orders.
-- If you have duplicates, fix them first (e.g. keep one order per reference, delete or merge duplicates).
-- Backend already avoids creating duplicates by checking for existing order by payment_reference before insert.

-- CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_reference_key
--   ON orders (payment_reference)
--   WHERE payment_reference IS NOT NULL AND payment_reference != '';
