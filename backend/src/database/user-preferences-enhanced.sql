-- Enhanced User Preferences Schema
-- Add these columns to user_preferences table for onboarding data

-- Update user_preferences table with onboarding fields
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS cooking_frequency TEXT,
ADD COLUMN IF NOT EXISTS shopping_frequency TEXT,
ADD COLUMN IF NOT EXISTS budget_range TEXT,
ADD COLUMN IF NOT EXISTS cooking_skill TEXT,
ADD COLUMN IF NOT EXISTS meal_planning BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cuisine_preferences TEXT[],
ADD COLUMN IF NOT EXISTS favorite_ingredients TEXT[],
ADD COLUMN IF NOT EXISTS allergies TEXT[],
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN public.user_preferences.role IS 'User role: parent, student, professional, senior, other';
COMMENT ON COLUMN public.user_preferences.cooking_frequency IS 'How often user cooks: daily, 3-4 times/week, 1-2 times/week, rarely';
COMMENT ON COLUMN public.user_preferences.shopping_frequency IS 'Shopping frequency: daily, 2-3 times/week, weekly, bi-weekly, monthly';
COMMENT ON COLUMN public.user_preferences.budget_range IS 'Weekly budget range: under ₵100, ₵100-200, ₵200-500, ₵500+';
COMMENT ON COLUMN public.user_preferences.cooking_skill IS 'Cooking skill level: beginner, intermediate, advanced, expert';
COMMENT ON COLUMN public.user_preferences.cuisine_preferences IS 'Preferred cuisines array';
COMMENT ON COLUMN public.user_preferences.favorite_ingredients IS 'User favorite ingredients';
COMMENT ON COLUMN public.user_preferences.allergies IS 'Food allergies and intolerances';
COMMENT ON COLUMN public.user_preferences.onboarding_completed IS 'Whether user completed onboarding';

-- Create index for querying by onboarding status
CREATE INDEX IF NOT EXISTS idx_user_prefs_onboarding ON public.user_preferences(onboarding_completed);

-- Table for AI-generated product bundles
CREATE TABLE IF NOT EXISTS public.ai_product_bundles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bundle_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,  -- Student, Family, Health, etc.
  target_audience TEXT,     -- Who this bundle is for
  badge TEXT,               -- Most Popular, Best Value, etc.
  
  -- Bundle composition
  product_ids UUID[] NOT NULL,  -- Array of product UUIDs
  products_snapshot JSONB NOT NULL,  -- Product details at time of creation
  
  -- Pricing
  original_price DECIMAL(10,2) NOT NULL,
  current_price DECIMAL(10,2) NOT NULL,
  savings DECIMAL(10,2) NOT NULL,
  discount_percentage DECIMAL(5,2),
  
  -- Social proof
  rating DECIMAL(3,2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  
  -- Metadata
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  generated_by TEXT DEFAULT 'ai',  -- 'ai' or 'admin'
  generation_prompt TEXT,  -- AI prompt used to generate
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE  -- Optional expiry for limited-time bundles
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bundles_category ON public.ai_product_bundles(category);
CREATE INDEX IF NOT EXISTS idx_bundles_active ON public.ai_product_bundles(is_active);
CREATE INDEX IF NOT EXISTS idx_bundles_rating ON public.ai_product_bundles(rating DESC);
CREATE INDEX IF NOT EXISTS idx_bundles_created_at ON public.ai_product_bundles(created_at DESC);

-- RLS policies for bundles
ALTER TABLE public.ai_product_bundles ENABLE ROW LEVEL SECURITY;

-- Everyone can view active bundles
CREATE POLICY "Anyone can view active bundles"
  ON public.ai_product_bundles
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage bundles
CREATE POLICY "Admins can manage bundles"
  ON public.ai_product_bundles
  FOR ALL
  USING (true)  -- Service role handles this
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.ai_product_bundles TO anon, authenticated;
GRANT ALL ON public.ai_product_bundles TO service_role;

COMMENT ON TABLE public.ai_product_bundles IS 'AI-generated and curated product bundles for quick shopping';

