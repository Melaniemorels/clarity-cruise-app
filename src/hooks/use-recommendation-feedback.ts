import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FeedbackAction = "like" | "save" | "skip" | "not_interested";

export function useRecommendationFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      provider,
      action,
      contextTag,
    }: {
      itemId: string;
      provider?: string;
      action: FeedbackAction;
      contextTag?: string;
    }) => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/recommendation_feedback`,
        {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal,resolution=merge-duplicates",
          },
          body: JSON.stringify({
            user_id: user!.id,
            item_id: itemId,
            provider: provider || "vyv",
            action,
            context_tag: contextTag,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to save feedback");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
}

export function useMarkSeen() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemId,
      provider,
    }: {
      itemId: string;
      provider?: string;
    }) => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/seen_items`,
        {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal,resolution=ignore-duplicates",
          },
          body: JSON.stringify({
            user_id: user!.id,
            item_id: itemId,
            provider: provider || "vyv",
          }),
        }
      );
    },
  });
}
