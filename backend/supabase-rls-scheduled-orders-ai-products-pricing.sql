-- RLS policies for scheduled_orders, ai_products, ai_product_bundles, and pricing_range_settings.
-- Run this in the Supabase SQL Editor after the tables exist.
-- Ensure ai_products and ai_product_bundles exist (create them first if your project has separate migrations).
-- Backend uses createAdminClient() (service role), which bypasses RLS; these policies protect
-- direct Supabase access (e.g. with anon key) and enforce user-scoped access where applicable.

-- =============================================================================
-- 1. scheduled_orders
-- Users may only see and modify their own scheduled orders (user_id = auth.uid()).
-- =============================================================================
ALTER TABLE IF EXISTS public.scheduled_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scheduled_orders_select_own" ON public.scheduled_orders;
CREATE POLICY "scheduled_orders_select_own"
  ON public.scheduled_orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "scheduled_orders_insert_own" ON public.scheduled_orders;
CREATE POLICY "scheduled_orders_insert_own"
  ON public.scheduled_orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "scheduled_orders_update_own" ON public.scheduled_orders;
CREATE POLICY "scheduled_orders_update_own"
  ON public.scheduled_orders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "scheduled_orders_delete_own" ON public.scheduled_orders;
CREATE POLICY "scheduled_orders_delete_own"
  ON public.scheduled_orders FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- 2. ai_products
-- Admin-only table (backend uses service role). Enable RLS so anon/authenticated
-- get no access when using Supabase client; service_role bypasses RLS.
-- =============================================================================
ALTER TABLE IF EXISTS public.ai_products ENABLE ROW LEVEL SECURITY;

-- No permissive policies: only service_role (backend) can access.
-- Optionally allow read for authenticated if you ever need to read from frontend:
-- CREATE POLICY "ai_products_read" ON public.ai_products FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- 3. ai_product_bundles
-- Same as ai_products: admin-only, backend uses service role.
-- =============================================================================
ALTER TABLE IF EXISTS public.ai_product_bundles ENABLE ROW LEVEL SECURITY;

-- No permissive policies: only service_role can access.

-- =============================================================================
-- 4. pricing_range_settings
-- Admin-only settings (backend uses service role). Enable RLS so anon/authenticated
-- get no access; service_role bypasses RLS.
-- =============================================================================
ALTER TABLE IF EXISTS public.pricing_range_settings ENABLE ROW LEVEL SECURITY;

-- No permissive policies: only service_role can access.
