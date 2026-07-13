import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FeedReason } from "@/lib/explore-reasons";

export interface ExploreItem {
  id: string;
  title: string;
  description: string | null;
  source: string;
  url: string;
  duration_min: number | null;
  category: string;
  tags: string[];
  language: string | null;
  creator: string | null;
  thumbnail: string | null;
  is_verified: boolean;
  popularity_score: number;
  created_at: string;
  /** Structured reason behind the recommendation (localized client-side) */
  reason?: FeedReason | null;
}

interface ExploreFeedResponse {
  items: ExploreItem[];
  nextPage: number | null;
  total: number;
}

async function fetchExploreFeed(params: {
  mode: "for_you" | "see_all";
  category?: string;
  page?: number;
  pageSize?: number;
  language?: string;
  exclude_ids?: string[];
}): Promise<ExploreFeedResponse> {
  // Always fetch a fresh session: Clerk tokens are short-lived, and the
  // AuthContext session intentionally carries no token.
  const fresh = (await supabase.auth.getSession()).data.session;
  if (!fresh?.access_token) throw new Error("Not authenticated");

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explore-feed`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch explore feed");
  }

  return response.json();
}

/** "Para Ti" carousel — small batch, personalized */
export function useForYouFeed(category?: string, excludeIds?: string[]) {
  const { session } = useAuth();
  const { i18n } = useTranslation();
  const lang = i18n.language?.split("-")[0] || "es";
  const excludeKey = excludeIds?.length ? [...excludeIds].sort().join(",") : "";

  return useQuery({
    queryKey: ["explore-feed", "for_you", category, lang, excludeKey],
    queryFn: () =>
      fetchExploreFeed({
        mode: "for_you",
        category: category || undefined,
        pageSize: 8,
        language: lang,
        exclude_ids: excludeIds?.length ? excludeIds : undefined,
      }),
    enabled: !!session,
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

/** "Ver Todo" — paginated list */
export function useSeeAllFeed(category?: string) {
  const { session } = useAuth();
  const { i18n } = useTranslation();
  const lang = i18n.language?.split("-")[0] || "es";

  return useInfiniteQuery({
    queryKey: ["explore-feed", "see_all", category, lang],
    queryFn: ({ pageParam = 0 }) =>
      fetchExploreFeed({
        mode: "see_all",
        category: category || undefined,
        page: pageParam,
        pageSize: 24,
        language: lang,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!session,
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 120 * 1000, // silent refresh every 2 min
  });
}

/** Log item events (seen, open, save, dismiss) */
export function useLogItemEvent() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      event,
    }: {
      itemId: string;
      event: "seen" | "open" | "save" | "unsave" | "dismiss";
    }) => {
      if (!session) throw new Error("Not authenticated");

      const fresh = (await supabase.auth.getSession()).data.session;
      if (!fresh?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explore-feed`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "log_event",
            item_id: itemId,
            event,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to log event");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["explore-feed"] });
    },
  });
}
