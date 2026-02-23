-- Run this in Supabase SQL Editor if your products table does not have original_price.
-- original_price = supplier/cost price (unchanged by pricing page). price = selling price (updated when you Apply pricing).

ALTER TABLE products
ADD COLUMN IF NOT EXISTS original_price NUMERIC;

-- Backfill: set original_price = price for existing rows where original_price is null
UPDATE products SET original_price = price WHERE original_price IS NULL;
