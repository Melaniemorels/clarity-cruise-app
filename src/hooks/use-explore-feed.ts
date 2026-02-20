import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface ExploreItem {
  id: string;
  title: string;
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
}

interface ExploreFeedResponse {
  items: ExploreItem[];
  nextPage: number | null;
  total: number;
}

async function fetchExploreFeed(
  accessToken: string,
  params: {
    mode: "for_you" | "see_all";
    category?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<ExploreFeedResponse> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explore-feed`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
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
export function useForYouFeed(category?: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["explore-feed", "for_you", category],
    queryFn: () =>
      fetchExploreFeed(session!.access_token, {
        mode: "for_you",
        category: category || undefined,
        pageSize: 8,
      }),
    enabled: !!session,
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

/** "Ver Todo" — paginated list */
export function useSeeAllFeed(category?: string) {
  const { session } = useAuth();

  return useInfiniteQuery({
    queryKey: ["explore-feed", "see_all", category],
    queryFn: ({ pageParam = 0 }) =>
      fetchExploreFeed(session!.access_token, {
        mode: "see_all",
        category: category || undefined,
        page: pageParam,
        pageSize: 24,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!session,
    staleTime: 3 * 60 * 1000,
  });
}

/** Log item events (seen, open, save, dismiss) via edge function */
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

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explore-feed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "log_event", item_id: itemId, event }),
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
