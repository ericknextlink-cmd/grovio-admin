-- Security hardening: RLS policies, drop permissive policies, function search_path.
-- Run in Supabase SQL Editor after reviewing. Assumes backend uses service_role (bypasses RLS);
-- anon/authenticated clients must not rely on direct PostgREST access to these tables.
--
-- Not fixable here: enable "Leaked password protection" under Dashboard > Authentication > Providers > Email (or Auth settings).

-- =============================================================================
-- 1) Tables with RLS enabled but zero policies (linter INFO 0008)
--    Explicit deny for anon + authenticated documents intent; service_role unaffected.
-- =============================================================================
ALTER TABLE IF EXISTS public.delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cron_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deleted_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discount_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pricing_range_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "block_anon_authenticated_all" ON public.delivery_settings;
CREATE POLICY "block_anon_authenticated_all"
  ON public.delivery_settings
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "block_anon_authenticated_all" ON public.ai_products;
CREATE POLICY "block_anon_authenticated_all"
  ON public.ai_products
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "block_anon_authenticated_all" ON public.cron_locks;
CREATE POLICY "block_anon_authenticated_all"
  ON public.cron_locks
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "block_anon_authenticated_all" ON public.deleted_users;
CREATE POLICY "block_anon_authenticated_all"
  ON public.deleted_users
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "block_anon_authenticated_all" ON public.discount_vouchers;
CREATE POLICY "block_anon_authenticated_all"
  ON public.discount_vouchers
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "block_anon_authenticated_all" ON public.order_status_history;
CREATE POLICY "block_anon_authenticated_all"
  ON public.order_status_history
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "block_anon_authenticated_all" ON public.pricing_range_settings;
CREATE POLICY "block_anon_authenticated_all"
  ON public.pricing_range_settings
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "block_anon_authenticated_all" ON public.user_vouchers;
CREATE POLICY "block_anon_authenticated_all"
  ON public.user_vouchers
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ai_product_bundles: same pattern (replaces empty RLS + removes need for permissive admin policy)
DROP POLICY IF EXISTS "block_anon_authenticated_all" ON public.ai_product_bundles;
CREATE POLICY "block_anon_authenticated_all"
  ON public.ai_product_bundles
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- =============================================================================
-- 2) Drop overly permissive RLS policies (linter WARN 0024)
--    Keep normal user flows covered by supabase-rls-orders-users-products.sql etc.
-- =============================================================================
DROP POLICY IF EXISTS "Admin users can manage admin accounts" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can manage bundles" ON public.ai_product_bundles;
DROP POLICY IF EXISTS "System can create recommendations" ON public.ai_recommendations;
DROP POLICY IF EXISTS "System can insert orders" ON public.orders;
DROP POLICY IF EXISTS "System can update orders" ON public.orders;
DROP POLICY IF EXISTS "System can update pending orders" ON public.pending_orders;
DROP POLICY IF EXISTS "Admins can manage transactions" ON public.transactions;

-- Optional explicit lock-down (only if these tables have RLS enabled and no other client policies needed)
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_anon_authenticated_all" ON public.admin_users;
CREATE POLICY "block_anon_authenticated_all"
  ON public.admin_users
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

ALTER TABLE IF EXISTS public.ai_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_anon_authenticated_all" ON public.ai_recommendations;
DROP POLICY IF EXISTS "ai_recommendations_select_own" ON public.ai_recommendations;
CREATE POLICY "ai_recommendations_select_own"
  ON public.ai_recommendations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ai_recommendations_insert_own" ON public.ai_recommendations;
CREATE POLICY "ai_recommendations_insert_own"
  ON public.ai_recommendations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_anon_authenticated_all" ON public.transactions;
CREATE POLICY "block_anon_authenticated_all"
  ON public.transactions
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- =============================================================================
-- 3) Function search_path (linter WARN 0011) — stable resolution for public functions
-- =============================================================================
DO $$
DECLARE
  fn text;
  candidates text[] := ARRAY[
    'update_order_timestamp',
    'cleanup_expired_pending_orders',
    'decrement_product_stock',
    'increment_product_stock',
    'set_updated_at',
    'update_ai_thread_timestamp',
    'update_ai_products_updated_at',
    'update_cart_updated_at'
  ];
  r record;
BEGIN
  FOREACH fn IN ARRAY candidates
  LOOP
    FOR r IN
      SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = fn
    LOOP
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
    END LOOP;
  END LOOP;
END $$;
