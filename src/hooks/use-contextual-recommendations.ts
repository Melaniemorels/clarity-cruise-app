import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

export interface ContextualRec {
  title: string;
  category: string;
  reason: string;
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
  accessToken: string,
  target: "home" | "explorer" | "both",
  language: string,
  forceRefresh = false
): Promise<ContextualRecommendationsResponse> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contextual-recommendations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        mode: "generate",
        target,
        language,
        force_refresh: forceRefresh,
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
    queryFn: () => fetchContextualRecs(session!.access_token, "explorer", lang),
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
    queryFn: () => fetchContextualRecs(session!.access_token, "home", lang),
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
    mutationFn: async (target: "home" | "explorer" | "both") => {
      if (!session?.access_token) throw new Error("Not authenticated");
      const lang = i18n.language?.split("-")[0] || "es";
      return fetchContextualRecs(session.access_token, target, lang, true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contextual-recs"] });
    },
  });
}
