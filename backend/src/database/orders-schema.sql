-- Orders and Payment System Schema
-- Run this in your Supabase SQL Editor

-- 1. Orders table (complete orders with payment confirmed)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,  -- Format: ORD-AC23-233E
  invoice_number TEXT NOT NULL UNIQUE,  -- Format: 4787837473 (10 digits)
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Order Details
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Payment pending
    'processing',   -- Being prepared
    'shipped',      -- Out for delivery
    'delivered',    -- Completed
    'cancelled',    -- Cancelled by user/admin
    'failed'        -- Payment/processing failed
  )),
  
  -- Financial Info
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  credits DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'GHS',
  
  -- Payment Info
  payment_method TEXT DEFAULT 'paystack',
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
    'pending',
    'paid',
    'failed',
    'refunded',
    'cancelled'
  )),
  payment_reference TEXT,  -- Paystack reference
  payment_access_code TEXT,  -- Paystack access code
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Delivery Info
  delivery_address JSONB NOT NULL,  -- { street, city, region, phone }
  delivery_notes TEXT,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Invoice/PDF
  invoice_pdf_url TEXT,  -- Supabase storage URL
  invoice_image_url TEXT,  -- PNG version
  invoice_qr_code TEXT,  -- QR code data URL
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE  -- For pending orders cleanup
);

-- 2. Order items (line items for each order)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  
  -- Product snapshot at time of order (in case product changes later)
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_image TEXT,
  category_name TEXT,
  subcategory TEXT,
  brand TEXT,
  
  -- Pricing
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price DECIMAL(10,2) NOT NULL,  -- unit_price * quantity
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Pending orders (before payment completion)
CREATE TABLE IF NOT EXISTS public.pending_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pending_order_id UUID NOT NULL UNIQUE,  -- Temporary identifier
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Cart data
  cart_items JSONB NOT NULL,  -- Snapshot of cart
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  credits DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Delivery
  delivery_address JSONB NOT NULL,
  delivery_notes TEXT,
  
  -- Payment tracking
  payment_reference TEXT UNIQUE,  -- From Paystack
  payment_access_code TEXT,
  payment_authorization_url TEXT,
  payment_status TEXT DEFAULT 'initialized' CHECK (payment_status IN (
    'initialized',  -- Payment link created
    'pending',      -- User redirected to pay
    'success',      -- Payment confirmed
    'failed',       -- Payment failed
    'cancelled',    -- User cancelled
    'abandoned'     -- User didn't complete
  )),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- Conversion tracking
  converted_to_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE
);

-- 4. Payment transactions (detailed payment history)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  
  -- Link to order
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  pending_order_id UUID REFERENCES public.pending_orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Payment provider details (Paystack)
  provider TEXT DEFAULT 'paystack',
  provider_reference TEXT NOT NULL UNIQUE,  -- Paystack reference
  provider_access_code TEXT,
  provider_transaction_id TEXT,
  
  -- Financial
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'GHS',
  fees DECIMAL(10,2) DEFAULT 0,  -- Transaction fees
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'success',
    'failed',
    'cancelled',
    'refunded'
  )),
  
  -- Payment details from provider
  payment_method TEXT,  -- card, mobile_money, bank, etc.
  channel TEXT,  -- card, bank, ussd, qr, mobile_money, bank_transfer
  card_type TEXT,  -- visa, mastercard, verve
  bank TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  ip_address TEXT,
  
  -- Provider response
  provider_response JSONB,
  
  -- Timestamps
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Order status history (audit trail)
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,  -- NULL for system changes
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON public.orders(invoice_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON public.orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_pending_orders_pending_id ON public.pending_orders(pending_order_id);
CREATE INDEX IF NOT EXISTS idx_pending_orders_user_id ON public.pending_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_orders_payment_ref ON public.pending_orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_pending_orders_status ON public.pending_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_pending_orders_expires_at ON public.pending_orders(expires_at);

CREATE INDEX IF NOT EXISTS idx_payment_trans_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_trans_provider_ref ON public.payment_transactions(provider_reference);
CREATE INDEX IF NOT EXISTS idx_payment_trans_status ON public.payment_transactions(status);

-- RLS Policies for security

-- Orders: Users can view their own orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (true);  -- Backend service role handles this

CREATE POLICY "System can update orders"
  ON public.orders
  FOR UPDATE
  USING (true);  -- Backend service role handles this

-- Order items: Users can view items for their orders
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
  ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Pending orders: Users can view and create their own
ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pending orders"
  ON public.pending_orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pending orders"
  ON public.pending_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update pending orders"
  ON public.pending_orders
  FOR UPDATE
  USING (true);  -- Backend handles payment verification

-- Payment transactions: Users can view their own transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION public.update_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS update_orders_timestamp ON public.orders;
CREATE TRIGGER update_orders_timestamp
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_timestamp();

DROP TRIGGER IF EXISTS update_pending_orders_timestamp ON public.pending_orders;
CREATE TRIGGER update_pending_orders_timestamp
  BEFORE UPDATE ON public.pending_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_timestamp();

DROP TRIGGER IF EXISTS update_payment_trans_timestamp ON public.payment_transactions;
CREATE TRIGGER update_payment_trans_timestamp
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_timestamp();

-- Function to clean up expired pending orders
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_orders()
RETURNS void AS $$
BEGIN
  UPDATE public.pending_orders
  SET payment_status = 'abandoned'
  WHERE expires_at < NOW()
  AND payment_status IN ('initialized', 'pending')
  AND converted_to_order_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pending_orders TO authenticated;
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT SELECT, INSERT ON public.order_status_history TO authenticated;

-- Comments
COMMENT ON TABLE public.orders IS 'Confirmed orders with successful payment';
COMMENT ON TABLE public.pending_orders IS 'Pending orders awaiting payment completion';
COMMENT ON TABLE public.payment_transactions IS 'Payment transaction history from Paystack';
COMMENT ON TABLE public.order_status_history IS 'Audit trail of order status changes';
COMMENT ON COLUMN public.orders.order_id IS 'Human-readable order ID: ORD-AC23-233E';
COMMENT ON COLUMN public.orders.invoice_number IS 'Numeric invoice number: 4787837473';
COMMENT ON COLUMN public.pending_orders.pending_order_id IS 'Temporary UUID before payment confirmation';

