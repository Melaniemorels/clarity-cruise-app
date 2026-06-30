
-- Drop existing recursive policies
DROP POLICY IF EXISTS "Users can view plans they created or are invited to" ON public.social_plans;
DROP POLICY IF EXISTS "Users can view invites for their plans or where they are invited" ON public.social_plan_invites;
DROP POLICY IF EXISTS "Plan creators can insert invites" ON public.social_plan_invites;
DROP POLICY IF EXISTS "Plan creators can delete invites" ON public.social_plan_invites;

-- Security definer function to check plan ownership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_plan_creator(_plan_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.social_plans
    WHERE id = _plan_id AND creator_id = _user_id
  )
$$;

-- Security definer function to check if user is invited to a plan
CREATE OR REPLACE FUNCTION public.is_plan_invitee(_plan_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.social_plan_invites
    WHERE plan_id = _plan_id AND invitee_id = _user_id
  )
$$;

-- Non-recursive SELECT policy for social_plans
CREATE POLICY "Users can view plans they created or are invited to"
  ON public.social_plans FOR SELECT
  USING (
    creator_id = auth.uid() OR
    public.is_plan_invitee(id, auth.uid())
  );

-- Non-recursive SELECT policy for social_plan_invites
CREATE POLICY "Users can view invites for their plans or where they are invited"
  ON public.social_plan_invites FOR SELECT
  USING (
    invitee_id = auth.uid() OR
    public.is_plan_creator(plan_id, auth.uid())
  );

-- Non-recursive INSERT policy for social_plan_invites
CREATE POLICY "Plan creators can insert invites"
  ON public.social_plan_invites FOR INSERT
  WITH CHECK (
    public.is_plan_creator(plan_id, auth.uid())
  );

-- Non-recursive DELETE policy for social_plan_invites
CREATE POLICY "Plan creators can delete invites"
  ON public.social_plan_invites FOR DELETE
  USING (
    public.is_plan_creator(plan_id, auth.uid())
  );
