
-- Social plans table
CREATE TABLE public.social_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_minute INTEGER NOT NULL,
  end_minute INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Plan invites table
CREATE TABLE public.social_plan_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.social_plans(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_plan_invites ENABLE ROW LEVEL SECURITY;

-- RLS for social_plans
CREATE POLICY "Users can view plans they created or are invited to"
  ON public.social_plans FOR SELECT
  USING (
    creator_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.social_plan_invites WHERE plan_id = social_plans.id AND invitee_id = auth.uid())
  );

CREATE POLICY "Users can create their own plans"
  ON public.social_plans FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can update their own plans"
  ON public.social_plans FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "Users can delete their own plans"
  ON public.social_plans FOR DELETE
  USING (creator_id = auth.uid());

-- RLS for social_plan_invites
CREATE POLICY "Users can view invites for their plans or where they are invited"
  ON public.social_plan_invites FOR SELECT
  USING (
    invitee_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.social_plans WHERE id = social_plan_invites.plan_id AND creator_id = auth.uid())
  );

CREATE POLICY "Plan creators can insert invites"
  ON public.social_plan_invites FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.social_plans WHERE id = social_plan_invites.plan_id AND creator_id = auth.uid())
  );

CREATE POLICY "Invitees can update their own invite status"
  ON public.social_plan_invites FOR UPDATE
  USING (invitee_id = auth.uid());

CREATE POLICY "Plan creators can delete invites"
  ON public.social_plan_invites FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.social_plans WHERE id = social_plan_invites.plan_id AND creator_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_social_plans_creator ON public.social_plans(creator_id);
CREATE INDEX idx_social_plans_date ON public.social_plans(plan_date);
CREATE INDEX idx_social_plan_invites_plan ON public.social_plan_invites(plan_id);
CREATE INDEX idx_social_plan_invites_invitee ON public.social_plan_invites(invitee_id);

-- Trigger for updated_at
CREATE TRIGGER update_social_plans_updated_at
  BEFORE UPDATE ON public.social_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
