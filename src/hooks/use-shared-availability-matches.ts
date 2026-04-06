import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfDay, endOfDay, differenceInMinutes } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export interface SharedFreeBlock {
  friends: { name: string; avatar?: string }[];
  startMinute: number;
  endMinute: number;
}

type ApiOverlap = { start: string; end: string };

type ApiMatch = {
  friend_user_id: string;
  friend_name: string | null;
  friend_handle: string | null;
  overlaps: ApiOverlap[];
};

const MIN_OVERLAP_MIN = 30;

function displayName(m: ApiMatch): string {
  return (m.friend_name?.trim() || m.friend_handle?.trim() || "Friend") as string;
}

/**
 * Maps Edge Function results to timeline blocks (minutes from local midnight for `day`).
 */
export function mapSharedAvailabilityToBlocks(matches: ApiMatch[], day: Date): SharedFreeBlock[] {
  const day0 = startOfDay(day);
  const blocks: SharedFreeBlock[] = [];

  for (const m of matches) {
    const name = displayName(m);
    for (const o of m.overlaps) {
      const segStart = new Date(o.start);
      const segEnd = new Date(o.end);
      const winStart = startOfDay(day);
      const winEnd = endOfDay(day);
      const s = Math.max(segStart.getTime(), winStart.getTime());
      const e = Math.min(segEnd.getTime(), winEnd.getTime());
      if (e - s < MIN_OVERLAP_MIN * 60 * 1000) continue;

      const startMinute = Math.max(0, differenceInMinutes(new Date(s), day0));
      const endMinute = Math.min(24 * 60, Math.max(startMinute + MIN_OVERLAP_MIN, differenceInMinutes(new Date(e), day0)));

      blocks.push({
        friends: [{ name, avatar: undefined }],
        startMinute,
        endMinute,
      });
    }
  }

  blocks.sort((a, b) => a.startMinute - b.startMinute);
  return blocks.slice(0, 6);
}

/**
 * Real mutual free-time matches (friendships + dual opt-in). No event titles in API.
 */
export function useSharedAvailabilityMatches(day: Date) {
  const { user, session } = useAuth();
  const windowStart = startOfDay(day).toISOString();
  const windowEnd = endOfDay(day).toISOString();

  const query = useQuery({
    queryKey: ["shared-availability", user?.id, windowStart],
    queryFn: async (): Promise<SharedFreeBlock[]> => {
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shared-availability`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            window_start: windowStart,
            window_end: windowEnd,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        if (import.meta.env.DEV) {
          console.warn("[shared-availability] HTTP", res.status, text);
        }
        return [];
      }

      const data = (await res.json()) as { matches?: ApiMatch[] };
      return mapSharedAvailabilityToBlocks(data.matches ?? [], day);
    },
    enabled: !!user && !!session?.access_token,
    staleTime: 45_000,
    refetchOnWindowFocus: true,
  });

  const blocks = useMemo(
    () => query.data ?? [],
    [query.data]
  );

  return { ...query, blocks };
}

export function useInvalidateSharedAvailability() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["shared-availability"] });
}
