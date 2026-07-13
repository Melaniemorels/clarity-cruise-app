import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ExplorerItemRef } from "./use-saved-items";

/**
 * Open/continue tracking. Content plays in external apps (YouTube, Spotify…),
 * so real playback progress is unknowable: we track opens honestly and let
 * the user mark items completed.
 */
export interface ProgressItem {
  id: string;
  provider: string;
  provider_item_id: string;
  title: string;
  description: string | null;
  url: string | null;
  category: string | null;
  language: string | null;
  duration_min: number | null;
  thumbnail: string | null;
  creator: string | null;
  first_opened_at: string;
  last_opened_at: string;
  completed_at: string | null;
}

const QUERY_KEY = ["explorer-progress"];

export function useProgressItems() {
  const { session } = useAuth();

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<ProgressItem[]> => {
      const { data, error } = await supabase
        .from("explorer_progress")
        .select("*")
        .order("last_opened_at", { ascending: false })
        .limit(60);
      if (error) throw new Error(error.message);
      return (data ?? []) as ProgressItem[];
    },
    enabled: !!session,
    staleTime: 30 * 1000,
  });
}

/** Items opened but not yet completed — the "Continue" rail. */
export function useContinueItems() {
  const query = useProgressItems();
  return {
    ...query,
    data: (query.data ?? []).filter((p) => !p.completed_at),
  };
}

/** Record that the user opened a piece of content (fire-and-forget). */
export function useRecordOpen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ref: ExplorerItemRef) => {
      const { error } = await supabase.from("explorer_progress").upsert(
        {
          provider: ref.provider,
          provider_item_id: ref.providerItemId,
          title: ref.title,
          description: ref.description ?? null,
          url: ref.url ?? null,
          category: ref.category ?? null,
          language: ref.language ?? null,
          duration_min: ref.durationMin ?? null,
          thumbnail: ref.thumbnail ?? null,
          creator: ref.creator ?? null,
          last_opened_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider,provider_item_id" },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useMarkCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ref: ExplorerItemRef) => {
      // Upsert so "mark completed" also works for items never opened in-app.
      const { error } = await supabase.from("explorer_progress").upsert(
        {
          provider: ref.provider,
          provider_item_id: ref.providerItemId,
          title: ref.title,
          description: ref.description ?? null,
          url: ref.url ?? null,
          category: ref.category ?? null,
          language: ref.language ?? null,
          duration_min: ref.durationMin ?? null,
          thumbnail: ref.thumbnail ?? null,
          creator: ref.creator ?? null,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider,provider_item_id" },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/** Remove an item from the open/continue history entirely. */
export function useRemoveProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      provider,
      providerItemId,
    }: {
      provider: string;
      providerItemId: string;
    }) => {
      const { error } = await supabase
        .from("explorer_progress")
        .delete()
        .eq("provider", provider)
        .eq("provider_item_id", providerItemId);
      if (error) throw new Error(error.message);
    },
    onMutate: async ({ provider, providerItemId }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<ProgressItem[]>(QUERY_KEY);
      queryClient.setQueryData<ProgressItem[]>(QUERY_KEY, (old = []) =>
        old.filter(
          (p) =>
            !(
              p.provider === provider && p.provider_item_id === providerItemId
            ),
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
