-- OAuth-connected Spotify / YouTube tokens (written by connect-media Edge Function; RLS for client read/update)

CREATE TABLE IF NOT EXISTS public.media_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('spotify', 'youtube')),
  access_token text NOT NULL DEFAULT '',
  refresh_token text,
  is_active boolean NOT NULL DEFAULT true,
  scopes text[] NOT NULL DEFAULT '{}',
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  token_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_integrations_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS media_integrations_user_id_idx ON public.media_integrations (user_id);

ALTER TABLE public.media_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own media integrations" ON public.media_integrations;
CREATE POLICY "Users read own media integrations"
  ON public.media_integrations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own media integrations" ON public.media_integrations;
CREATE POLICY "Users insert own media integrations"
  ON public.media_integrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own media integrations" ON public.media_integrations;
CREATE POLICY "Users update own media integrations"
  ON public.media_integrations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
