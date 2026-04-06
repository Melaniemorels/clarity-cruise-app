-- Explicit friendship pairs (canonical ordering). Used for availability matching, separate from follows.
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_one_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  user_two_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_one_id < user_two_id),
  UNIQUE (user_one_id, user_two_id)
);

CREATE INDEX idx_friendships_user_one ON public.friendships (user_one_id);
CREATE INDEX idx_friendships_user_two ON public.friendships (user_two_id);
CREATE INDEX idx_friendships_status ON public.friendships (status) WHERE status = 'accepted';

COMMENT ON TABLE public.friendships IS 'Canonical friendship row (user_one_id < user_two_id). Mutual follow sync via ensure_friendship_from_mutual_follow.';

-- Per-user opt-in for sharing free/busy with accepted friends (no event titles leave the server in match results).
CREATE TABLE public.availability_sharing (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  share_free_busy_with_friends BOOLEAN NOT NULL DEFAULT false,
  show_friend_match_suggestions BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.availability_sharing IS 'Privacy flags for social calendar matching; both users must share_free_busy_with_friends for matches.';

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_sharing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view friendships they are in"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_one_id OR auth.uid() = user_two_id);

-- Inserts/updates happen via SECURITY DEFINER RPCs only (no direct INSERT for authenticated).
CREATE POLICY "No direct friendship insert"
  ON public.friendships FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct friendship update"
  ON public.friendships FOR UPDATE
  USING (false);

CREATE POLICY "No direct friendship delete"
  ON public.friendships FOR DELETE
  USING (false);

CREATE POLICY "Users manage own availability sharing row"
  ON public.availability_sharing FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own availability sharing"
  ON public.availability_sharing FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own availability sharing"
  ON public.availability_sharing FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Default row when a profile is created (all off until user opts in).
CREATE OR REPLACE FUNCTION public.ensure_availability_sharing_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.availability_sharing (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_availability_sharing ON public.profiles;
CREATE TRIGGER trg_profiles_availability_sharing
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_availability_sharing_for_profile();

-- Backfill existing users
INSERT INTO public.availability_sharing (user_id)
SELECT user_id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_friendship_from_mutual_follow(p_other_user UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  a UUID;
  b UUID;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_other_user IS NULL OR me = p_other_user THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = me AND following_id = p_other_user
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = p_other_user AND following_id = me
  ) THEN
    RETURN;
  END IF;

  a := LEAST(me, p_other_user);
  b := GREATEST(me, p_other_user);

  INSERT INTO public.friendships (user_one_id, user_two_id, status)
  VALUES (a, b, 'accepted')
  ON CONFLICT (user_one_id, user_two_id)
  DO UPDATE SET status = 'accepted', updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_friendship_pair_on_unfollow(p_other_user UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  a UUID;
  b UUID;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_other_user IS NULL OR me = p_other_user THEN
    RETURN;
  END IF;

  a := LEAST(me, p_other_user);
  b := GREATEST(me, p_other_user);

  DELETE FROM public.friendships
  WHERE user_one_id = a AND user_two_id = b;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_friendship_from_mutual_follow(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_friendship_from_mutual_follow(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.clear_friendship_pair_on_unfollow(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_friendship_pair_on_unfollow(UUID) TO authenticated;
