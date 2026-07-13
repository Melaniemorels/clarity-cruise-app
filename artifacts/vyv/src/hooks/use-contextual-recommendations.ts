import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { FeedReason } from "@/lib/explore-reasons";

export interface ContextualRec {
  title: string;
  category: string;
  reason: FeedReason | string;
  duration_min: number;
  mood: string;
  url?: string;
  item_id?: string;
  source?: string;
  creator?: string;
  tags?: string[];
}

export interface ContextualRecommendationsResponse {
  recommendations: {
    home: ContextualRec[];
    explorer: ContextualRec[];
  };
  signals: Record<string, unknown>;
  cached: boolean;
  target: string;
}

async function fetchContextualRecs(
  target: "home" | "explorer" | "both",
  language: string,
  forceRefresh = false,
  excludeIds?: string[]
): Promise<ContextualRecommendationsResponse> {
  // Always fetch a fresh session so an expired access_token is auto-refreshed
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) throw new Error("Not authenticated");

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contextual-recommendations`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "generate",
        target,
        language,
        force_refresh: forceRefresh,
        exclude_ids: excludeIds?.length ? excludeIds : undefined,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch contextual recommendations");
  }

  return response.json();
}

/** Contextual recommendations for Explorer (deep discovery) */
export function useExplorerContextualRecs() {
  const { session } = useAuth();
  const { i18n } = useTranslation();
  const lang = i18n.language?.split("-")[0] || "es";

  return useQuery({
    queryKey: ["contextual-recs", "explorer", lang],
    queryFn: () => fetchContextualRecs("explorer", lang),
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 3 * 60 * 1000, // refresh every 3 min
  });
}

/** Contextual recommendations for Home (quick conceptual recs) */
export function useHomeContextualRecs() {
  const { session } = useAuth();
  const { i18n } = useTranslation();
  const lang = i18n.language?.split("-")[0] || "es";

  return useQuery({
    queryKey: ["contextual-recs", "home", lang],
    queryFn: () => fetchContextualRecs("home", lang),
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 3 * 60 * 1000,
  });
}

/** Force refresh contextual recs */
export function useRefreshContextualRecs() {
  const { session } = useAuth();
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input:
        | "home"
        | "explorer"
        | "both"
        | { target: "home" | "explorer" | "both"; excludeIds?: string[] }
    ) => {
      if (!session) throw new Error("Not authenticated");
      const { target, excludeIds } =
        typeof input === "string" ? { target: input, excludeIds: undefined } : input;
      const lang = i18n.language?.split("-")[0] || "es";
      return fetchContextualRecs(target, lang, true, excludeIds);
    },
    onSuccess: (data, input) => {
      // Write the fresh response (which honored exclude_ids) straight into the
      // cache. A plain invalidate would refetch WITHOUT the exclusions and
      // overwrite this result with the same items we just asked to replace.
      const target = typeof input === "string" ? input : input.target;
      const lang = i18n.language?.split("-")[0] || "es";
      const targets = target === "both" ? ["explorer", "home"] : [target];
      for (const key of targets) {
        queryClient.setQueryData(["contextual-recs", key, lang], data);
      }
    },
  });
}
