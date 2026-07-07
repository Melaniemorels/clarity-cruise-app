import { useMemo } from "react";
import { isSameDay, startOfDay, endOfDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FriendFreeSlot {
  friendId?: string;
  friendName: string;
  friendAvatar?: string;
  startMinute: number;
  endMinute: number;
}

export interface SharedFreeBlock {
  friends: { id?: string; name: string; avatar?: string }[];
  startMinute: number;
  endMinute: number;
}

interface FriendAvailabilityResponse {
  friends: { id: string; name: string; avatar?: string }[];
  busy: { friendId: string; starts_at: string; ends_at: string }[];
}

interface EventBlock {
  starts_at: string;
  ends_at: string;
}

const DAY_START = 7 * 60;
const DAY_END = 22 * 60;

// Build free intervals (7:00-22:00) from a list of busy intervals in minutes
function freeFromBusy(
  busy: { start: number; end: number }[]
): { start: number; end: number }[] {
  const sorted = [...busy].sort((a, b) => a.start - b.start);
  const free: { start: number; end: number }[] = [];
  let cursor = DAY_START;

  for (const b of sorted) {
    if (b.start > cursor) {
      free.push({ start: cursor, end: Math.min(b.start, DAY_END) });
    }
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < DAY_END) {
    free.push({ start: cursor, end: DAY_END });
  }
  return free.filter((f) => f.end > f.start);
}

// Convert an absolute instant to viewer-local minutes-from-midnight, clamped
// to the viewed day. Same model as the user's own events (getHours-based), so
// friend busy blocks line up with the timeline exactly like local events do.
function toMinutes(iso: string, dayStart: Date, dayEnd: Date): number {
  const d = new Date(iso);
  if (d <= dayStart) return 0;
  if (d >= dayEnd) return 24 * 60;
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Detects shared free time between the user and their mutual friends,
 * based on the friends' real calendar events.
 * Groups overlapping friends into single blocks.
 */
export function useFriendAvailability(
  date: Date,
  events: EventBlock[]
): SharedFreeBlock[] {
  const { user } = useAuth();
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const dayKey = dayStart.toISOString();

  const { data } = useQuery({
    queryKey: ["friend-availability", user?.id, dayKey],
    queryFn: async (): Promise<FriendAvailabilityResponse> => {
      const { data, error } = await supabase.functions.invoke(
        "friend-availability",
        {
          body: {
            dayStartIso: dayStart.toISOString(),
            dayEndIso: dayEnd.toISOString(),
          },
        }
      );
      if (error) throw new Error(error.message);
      return (data as FriendAvailabilityResponse) ?? { friends: [], busy: [] };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  return useMemo(() => {
    const friends = data?.friends ?? [];
    if (friends.length === 0) return [];

    // 1. Build user's busy intervals (in minutes from midnight)
    const busyIntervals = events
      .filter((e) => isSameDay(new Date(e.starts_at), date))
      .map((e) => {
        const start = new Date(e.starts_at);
        const end = new Date(e.ends_at);
        return {
          start: start.getHours() * 60 + start.getMinutes(),
          end: end.getHours() * 60 + end.getMinutes(),
        };
      });

    // 2. Build user's free intervals (only between 7am-22pm)
    const userFree = freeFromBusy(busyIntervals);

    // 3. Build each friend's free slots from their real busy intervals
    const busyByFriend = new Map<string, { start: number; end: number }[]>();
    for (const b of data?.busy ?? []) {
      const list = busyByFriend.get(b.friendId) ?? [];
      list.push({
        start: toMinutes(b.starts_at, dayStart, dayEnd),
        end: toMinutes(b.ends_at, dayStart, dayEnd),
      });
      busyByFriend.set(b.friendId, list);
    }

    const friendSlots: FriendFreeSlot[] = [];
    for (const friend of friends) {
      const free = freeFromBusy(busyByFriend.get(friend.id) ?? []);
      for (const slot of free) {
        friendSlots.push({
          friendId: friend.id,
          friendName: friend.name,
          friendAvatar: friend.avatar,
          startMinute: slot.start,
          endMinute: slot.end,
        });
      }
    }

    // 4. Find all individual overlaps
    const rawOverlaps: {
      friend: { id?: string; name: string; avatar?: string };
      start: number;
      end: number;
    }[] = [];

    for (const freeBlock of userFree) {
      for (const friendSlot of friendSlots) {
        const overlapStart = Math.max(freeBlock.start, friendSlot.startMinute);
        const overlapEnd = Math.min(freeBlock.end, friendSlot.endMinute);

        if (overlapEnd - overlapStart >= 30) {
          rawOverlaps.push({
            friend: {
              id: friendSlot.friendId,
              name: friendSlot.friendName,
              avatar: friendSlot.friendAvatar,
            },
            start: overlapStart,
            end: overlapEnd,
          });
        }
      }
    }

    // 5. Merge overlapping intervals and group friends
    if (rawOverlaps.length === 0) return [];

    // Sort by start time
    rawOverlaps.sort((a, b) => a.start - b.start);

    const merged: SharedFreeBlock[] = [];
    let current = {
      friends: [rawOverlaps[0].friend],
      startMinute: rawOverlaps[0].start,
      endMinute: rawOverlaps[0].end,
    };

    for (let i = 1; i < rawOverlaps.length; i++) {
      const overlap = rawOverlaps[i];
      // If overlaps with current block, merge
      if (overlap.start < current.endMinute) {
        current.endMinute = Math.max(current.endMinute, overlap.end);
        if (
          !current.friends.some(
            (f) => (f.id ?? f.name) === (overlap.friend.id ?? overlap.friend.name)
          )
        ) {
          current.friends.push(overlap.friend);
        }
      } else {
        merged.push(current);
        current = {
          friends: [overlap.friend],
          startMinute: overlap.start,
          endMinute: overlap.end,
        };
      }
    }
    merged.push(current);

    // Limit to 2 suggestions max
    return merged.slice(0, 2);
  }, [date, events, data]);
}
