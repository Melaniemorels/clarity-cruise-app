
-- Memory type enum
DO $$ BEGIN
  CREATE TYPE public.ai_memory_type AS ENUM ('preference','goal','routine','relationship','health','work','calendar','interest','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE public.ai_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  memory_type public.ai_memory_type NOT NULL DEFAULT 'other',
  importance_score INTEGER NOT NULL DEFAULT 5 CHECK (importance_score BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ai_memories_user_idx ON public.ai_memories(user_id, importance_score DESC, last_accessed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_memories TO authenticated;
GRANT ALL ON public.ai_memories TO service_role;

ALTER TABLE public.ai_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own memories"
  ON public.ai_memories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ai_memories_updated_at
  BEFORE UPDATE ON public.ai_memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profile toggle
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_memory_enabled BOOLEAN NOT NULL DEFAULT true;
