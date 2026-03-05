-- AI conversation threads for chat history and LangChain-style context tracking.
-- Run this in Supabase SQL editor if the table does not exist.
-- Backend uses: thread_id (UUID), user_id, messages (JSONB), context (JSONB), created_at, updated_at.

CREATE TABLE IF NOT EXISTS ai_conversation_threads (
  thread_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_threads_user_id ON ai_conversation_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_threads_updated_at ON ai_conversation_threads(updated_at DESC);

COMMENT ON TABLE ai_conversation_threads IS 'Stores AI chat threads per user; used for history and context (LangChain-style thread tracking).';

-- RLS mandatory: users may only access their own threads (backend uses service role and bypasses RLS).
ALTER TABLE ai_conversation_threads ENABLE ROW LEVEL SECURITY;

-- user_id is TEXT; cast auth.uid() to text in a SELECT so comparison is text = text (Supabase guidance).
DROP POLICY IF EXISTS "Users can manage own threads" ON ai_conversation_threads;
CREATE POLICY "Users can manage own threads" ON ai_conversation_threads
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text))
  WITH CHECK (user_id = (SELECT auth.uid()::text));
