
-- Add per-user toggle for VYV Guide calendar access
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_calendar_access_enabled boolean NOT NULL DEFAULT false;

-- Audit log of AI-initiated calendar actions
CREATE TABLE IF NOT EXISTS public.ai_calendar_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create','update','delete')),
  event_id uuid,
  before jsonb,
  after jsonb,
  prompt text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_calendar_audit TO authenticated;
GRANT ALL ON public.ai_calendar_audit TO service_role;

ALTER TABLE public.ai_calendar_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ai calendar audit"
  ON public.ai_calendar_audit FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS ai_calendar_audit_user_created_idx
  ON public.ai_calendar_audit (user_id, created_at DESC);
