-- RLS policies for orders, order_items, pending_orders, payment_transactions, users, products.
-- Run in Supabase SQL Editor. Backend uses service_role for admin; these policies protect
-- anon/authenticated direct access and scope access by user where applicable.

-- =============================================================================
-- 1. orders
-- Authenticated users see only their own orders. No anon access.
-- =============================================================================
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE for anon or authenticated (backend service_role only).

-- =============================================================================
-- 2. order_items
-- Users see order_items only for their own orders.
-- =============================================================================
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_via_order" ON public.order_items;
CREATE POLICY "order_items_select_via_order"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 3. pending_orders
-- Users see only their own pending orders (user_id = auth.uid()).
-- =============================================================================
ALTER TABLE IF EXISTS public.pending_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pending_orders_select_own" ON public.pending_orders;
CREATE POLICY "pending_orders_select_own"
  ON public.pending_orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "pending_orders_insert_own" ON public.pending_orders;
CREATE POLICY "pending_orders_insert_own"
  ON public.pending_orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update/delete only own (e.g. cancel).
DROP POLICY IF EXISTS "pending_orders_update_own" ON public.pending_orders;
CREATE POLICY "pending_orders_update_own"
  ON public.pending_orders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "pending_orders_delete_own" ON public.pending_orders;
CREATE POLICY "pending_orders_delete_own"
  ON public.pending_orders FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- 4. payment_transactions
-- Users see only transactions for their own orders.
-- =============================================================================
ALTER TABLE IF EXISTS public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_transactions_select_own" ON public.payment_transactions;
CREATE POLICY "payment_transactions_select_own"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (
    order_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payment_transactions.order_id AND o.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 5. users
-- Users can read/update only their own row (id = auth.uid()).
-- =============================================================================
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No INSERT/DELETE for authenticated (signup/deletion via backend only).

-- =============================================================================
-- 6. products
-- Public read for products (catalog). Write only via service_role.
-- =============================================================================
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select_public" ON public.products;
CREATE POLICY "products_select_public"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE for anon or authenticated (admin uses service_role).

-- =============================================================================
-- 7. cart
-- Users see and modify only their own cart (user_id = auth.uid()).
-- =============================================================================
ALTER TABLE IF EXISTS public.cart ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cart_select_own" ON public.cart;
CREATE POLICY "cart_select_own"
  ON public.cart FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "cart_insert_own" ON public.cart;
CREATE POLICY "cart_insert_own"
  ON public.cart FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "cart_update_own" ON public.cart;
CREATE POLICY "cart_update_own"
  ON public.cart FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "cart_delete_own" ON public.cart;
CREATE POLICY "cart_delete_own"
  ON public.cart FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- 8. favorites
-- Users see and modify only their own favorites (user_id = auth.uid()).
-- =============================================================================
ALTER TABLE IF EXISTS public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
CREATE POLICY "favorites_select_own"
  ON public.favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
CREATE POLICY "favorites_insert_own"
  ON public.favorites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
CREATE POLICY "favorites_delete_own"
  ON public.favorites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
