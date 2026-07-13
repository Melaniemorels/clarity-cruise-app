import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FeedbackAction =
  | "like"
  | "save"
  | "skip"
  | "not_interested"
  | "more_like_this"
  | "report";

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
          credentials: "include",
          headers: {
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
      queryClient.invalidateQueries({ queryKey: ["explore-feed"] });
      queryClient.invalidateQueries({ queryKey: ["contextual-recs"] });
    },
  });
}

/**
 * Hide a creator everywhere: appends the creator to
 * user_explore_preferences.blocked_creators (deduped) and refreshes feeds.
 */
export function useHideCreator() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (creator: string) => {
      const trimmed = creator.trim();
      if (!trimmed) throw new Error("No creator");

      const { data: existing, error: readError } = await supabase
        .from("user_explore_preferences")
        .select("blocked_creators")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (readError) throw new Error(readError.message);

      const current: string[] = existing?.blocked_creators ?? [];
      if (current.includes(trimmed)) return;

      const { error } = await supabase.from("user_explore_preferences").upsert(
        { blocked_creators: [...current, trimmed] },
        { onConflict: "user_id" },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["explore-feed"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["contextual-recs"] });
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
          credentials: "include",
          headers: {
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
