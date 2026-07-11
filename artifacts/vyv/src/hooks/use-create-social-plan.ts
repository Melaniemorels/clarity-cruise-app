import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CreateSocialPlanInput {
  title: string;
  note?: string | null;
  /** The day the plan is for (defaults to today). */
  date?: Date;
  startMinute: number;
  endMinute: number;
  /** Friends to invite — only those with a real id get invite + notification rows. */
  friends: { id?: string; name: string }[];
}

export interface CreateSocialPlanResult {
  planId: string;
  invitedCount: number;
}

/**
 * Creates a social plan, invite rows for each friend, and a `plan_invite`
 * notification for every invited friend, so they actually see the invite.
 */
export function useCreateSocialPlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: CreateSocialPlanInput,
    ): Promise<CreateSocialPlanResult> => {
      if (!user) throw new Error("Not authenticated");

      const planDate = (input.date ?? new Date()).toISOString().split("T")[0];

      // 1. Create the plan
      const { data: plan, error: planError } = await supabase
        .from("social_plans" as any)
        .insert({
          creator_id: user.id,
          title: input.title.trim(),
          note: input.note?.trim() || null,
          plan_date: planDate,
          start_minute: input.startMinute,
          end_minute: input.endMinute,
        })
        .select("id")
        .maybeSingle();

      if (planError) throw planError;
      const planId = (plan as any)?.id as string | undefined;
      if (!planId) throw new Error("Plan creation failed");

      // 2. Create invite rows for friends with real ids
      const invitees = input.friends.filter(
        (f): f is { id: string; name: string } => !!f.id && f.id !== user.id,
      );

      if (invitees.length > 0) {
        const { error: inviteError } = await supabase
          .from("social_plan_invites" as any)
          .insert(
            invitees.map((f) => ({ plan_id: planId, invitee_id: f.id })),
          );
        if (inviteError) throw inviteError;

        // 3. Notify each invited friend
        const results = await Promise.all(
          invitees.map((f) =>
            supabase.from("notifications" as any).insert({
              user_id: f.id,
              type: "plan_invite",
              actor_id: user.id,
              reference_id: planId,
              message: input.title.trim(),
            }),
          ),
        );
        const notifyError = results.find((r) => r.error)?.error;
        if (notifyError) throw notifyError;
      }

      return { planId, invitedCount: invitees.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
