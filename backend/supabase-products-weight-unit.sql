-- Add weight_unit so products can store weight in kg or grams.
-- Run in Supabase SQL Editor if the column does not exist.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS weight_unit text;

COMMENT ON COLUMN products.weight_unit IS 'Unit for weight: kg or g. When null, treat as kg for display.';

-- Optional: constrain to allowed values
-- ALTER TABLE products DROP CONSTRAINT IF EXISTS products_weight_unit_check;
-- ALTER TABLE products ADD CONSTRAINT products_weight_unit_check CHECK (weight_unit IS NULL OR weight_unit IN ('kg', 'g'));
