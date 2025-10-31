-- Stock Management Functions
-- Add these to your Supabase SQL Editor

-- Function to decrement product stock
CREATE OR REPLACE FUNCTION public.decrement_product_stock(
  product_id UUID,
  quantity INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET 
    quantity = GREATEST(quantity - quantity, 0),
    in_stock = CASE 
      WHEN (quantity - quantity) <= 0 THEN false 
      ELSE true 
    END,
    updated_at = NOW()
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment product stock (for cancellations/returns)
CREATE OR REPLACE FUNCTION public.increment_product_stock(
  product_id UUID,
  quantity INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET 
    quantity = quantity + quantity,
    in_stock = true,
    updated_at = NOW()
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_product_stock(UUID, INTEGER) TO service_role;

COMMENT ON FUNCTION public.decrement_product_stock IS 'Safely decrements product stock when order is placed';
COMMENT ON FUNCTION public.increment_product_stock IS 'Restores product stock when order is cancelled';

