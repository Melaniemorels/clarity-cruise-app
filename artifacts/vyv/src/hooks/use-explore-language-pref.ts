import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PREF_KEY = "explore-language-pref";

/** Reads the persisted "include content in other languages" preference. */
export function useIncludeOtherLanguages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [PREF_KEY, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from("user_explore_preferences")
        .select("include_other_languages")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as { include_other_languages?: boolean } | null)
        ?.include_other_languages ?? false;
    },
  });
}

/** Persists the preference and refreshes every language-dependent feed. */
export function useSetIncludeOtherLanguages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("user_explore_preferences")
        .upsert(
          { user_id: user!.id, include_other_languages: enabled },
          { onConflict: "user_id" },
        );
      if (error) throw new Error(error.message);
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: [PREF_KEY] });
      const previous = queryClient.getQueryData([PREF_KEY, user?.id]);
      queryClient.setQueryData([PREF_KEY, user?.id], enabled);
      return { previous };
    },
    onError: (_err, _enabled, ctx) => {
      queryClient.setQueryData([PREF_KEY, user?.id], ctx?.previous ?? false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PREF_KEY] });
      queryClient.invalidateQueries({ queryKey: ["explore-feed"] });
      queryClient.invalidateQueries({ queryKey: ["contextual-recs"] });
    },
  });
}
