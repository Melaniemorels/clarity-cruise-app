import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * A provider-agnostic reference to a piece of Explorer content.
 * - Catalogue items (explore_items): provider "vyv", providerItemId = row uuid.
 * - AI / Elevate cards without a catalogue id: provider from the URL,
 *   providerItemId = the URL itself (stable enough for dedupe).
 */
export interface ExplorerItemRef {
  provider: string;
  providerItemId: string;
  title: string;
  description?: string | null;
  url?: string | null;
  category?: string | null;
  language?: string | null;
  durationMin?: number | null;
  thumbnail?: string | null;
  creator?: string | null;
}

export interface SavedItem {
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
  saved_at: string;
}

export function savedItemKey(provider: string, providerItemId: string): string {
  return `${provider}:${providerItemId}`;
}

export function refKey(ref: ExplorerItemRef): string {
  return savedItemKey(ref.provider, ref.providerItemId);
}

const QUERY_KEY = ["explorer-saved-items"];

export function useSavedItems() {
  const { session } = useAuth();

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<SavedItem[]> => {
      const { data, error } = await supabase
        .from("explorer_saved_items")
        .select("*")
        .order("saved_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as SavedItem[];
    },
    enabled: !!session,
    staleTime: 60 * 1000,
  });
}

/** Fast lookup of saved state by provider:providerItemId. */
export function useSavedKeys(): Set<string> {
  const { data } = useSavedItems();
  return new Set(
    (data ?? []).map((s) => savedItemKey(s.provider, s.provider_item_id)),
  );
}

export function useToggleSave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ref,
      saved,
    }: {
      ref: ExplorerItemRef;
      saved: boolean;
    }) => {
      if (saved) {
        const { error } = await supabase
          .from("explorer_saved_items")
          .delete()
          .eq("provider", ref.provider)
          .eq("provider_item_id", ref.providerItemId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("explorer_saved_items").upsert(
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
          },
          { onConflict: "user_id,provider,provider_item_id" },
        );
        if (error) throw new Error(error.message);
      }
    },
    onMutate: async ({ ref, saved }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<SavedItem[]>(QUERY_KEY);
      queryClient.setQueryData<SavedItem[]>(QUERY_KEY, (old = []) => {
        if (saved) {
          return old.filter(
            (s) =>
              !(
                s.provider === ref.provider &&
                s.provider_item_id === ref.providerItemId
              ),
          );
        }
        const optimistic: SavedItem = {
          id: `optimistic-${Date.now()}`,
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
          saved_at: new Date().toISOString(),
        };
        return [
          optimistic,
          ...old.filter(
            (s) =>
              !(
                s.provider === ref.provider &&
                s.provider_item_id === ref.providerItemId
              ),
          ),
        ];
      });
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
