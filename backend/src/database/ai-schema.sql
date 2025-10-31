-- AI Conversation Threads Schema
-- Add this to your Supabase database

-- Table for storing AI conversation threads
CREATE TABLE IF NOT EXISTS public.ai_conversation_threads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  thread_id UUID NOT NULL UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_threads_user_id ON public.ai_conversation_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_threads_thread_id ON public.ai_conversation_threads(thread_id);
CREATE INDEX IF NOT EXISTS idx_ai_threads_updated_at ON public.ai_conversation_threads(updated_at);

-- Table for AI recommendation history (optional - for analytics)
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  thread_id UUID,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('budget', 'meal', 'search', 'chat')),
  context JSONB DEFAULT '{}'::jsonb,
  recommended_products JSONB DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10,2),
  budget DECIMAL(10,2),
  accepted BOOLEAN DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_ai_recs_user_id ON public.ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recs_type ON public.ai_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_ai_recs_created_at ON public.ai_recommendations(created_at);

-- RLS Policies for security

-- Users can only access their own threads
ALTER TABLE public.ai_conversation_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own threads"
  ON public.ai_conversation_threads
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own threads"
  ON public.ai_conversation_threads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads"
  ON public.ai_conversation_threads
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own threads"
  ON public.ai_conversation_threads
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for recommendations
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations"
  ON public.ai_recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recommendations"
  ON public.ai_recommendations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_ai_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamps
DROP TRIGGER IF EXISTS update_ai_thread_timestamp ON public.ai_conversation_threads;
CREATE TRIGGER update_ai_thread_timestamp
  BEFORE UPDATE ON public.ai_conversation_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_thread_timestamp();

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversation_threads TO authenticated;
GRANT SELECT, INSERT ON public.ai_recommendations TO authenticated;

COMMENT ON TABLE public.ai_conversation_threads IS 'Stores AI conversation threads for continuity and context';
COMMENT ON TABLE public.ai_recommendations IS 'Tracks AI recommendations for analytics and improvement';

