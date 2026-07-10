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
  friends: { id: string; name: string; avatar?: string; timezone?: string }[];
  busy: { friendId: string; starts_at: string; ends_at: string }[];
}

interface EventBlock {
  starts_at: string;
  ends_at: string;
}

const DAY_START = 7 * 60;
const DAY_END = 22 * 60;

interface Interval {
  start: number;
  end: number;
}

// Build free intervals from a list of busy intervals (all in viewer-local
// minutes), constrained to the given waking-hours windows. Defaults to the
// viewer-local 7:00-22:00 window.
function freeFromBusy(
  busy: Interval[],
  windows: Interval[] = [{ start: DAY_START, end: DAY_END }]
): Interval[] {
  const sorted = [...busy].sort((a, b) => a.start - b.start);
  const free: Interval[] = [];

  for (const w of windows) {
    let cursor = w.start;
    for (const b of sorted) {
      if (b.end <= cursor) continue;
      if (b.start >= w.end) break;
      if (b.start > cursor) {
        free.push({ start: cursor, end: Math.min(b.start, w.end) });
      }
      cursor = Math.max(cursor, b.end);
      if (cursor >= w.end) break;
    }
    if (cursor < w.end) {
      free.push({ start: cursor, end: w.end });
    }
  }
  return free.filter((f) => f.end > f.start);
}

// --- Timezone helpers -------------------------------------------------------
// A friend in another timezone is awake during *their* 7:00-22:00, not the
// viewer's. These helpers express a friend's waking hours as viewer-local
// minutes on the viewed day so free windows can be clipped to them.

interface WallParts {
  y: number;
  m: number;
  d: number;
  h: number;
  min: number;
}

function getWallParts(instant: Date, timeZone: string): WallParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts: Record<string, number> = {};
  for (const p of fmt.formatToParts(instant)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  return {
    y: parts.year,
    m: parts.month,
    d: parts.day,
    h: parts.hour % 24,
    min: parts.minute,
  };
}

// Absolute instant for a wall-clock time in a given IANA timezone.
function wallTimeToUtc(
  timeZone: string,
  y: number,
  m: number,
  d: number,
  h: number,
  min: number
): Date {
  const target = Date.UTC(y, m - 1, d, h, min);
  let utc = target;
  for (let i = 0; i < 2; i++) {
    const w = getWallParts(new Date(utc), timeZone);
    const asUtc = Date.UTC(w.y, w.m - 1, w.d, w.h, w.min);
    utc += target - asUtc;
  }
  return new Date(utc);
}

// The friend's 7:00-22:00 waking windows (in their own timezone) that overlap
// the viewed day, expressed as viewer-local minutes clamped to the day.
// Returns null if the timezone is unknown/invalid (caller falls back to the
// viewer-local default window).
function friendWakingWindows(
  timeZone: string,
  dayStart: Date,
  dayEnd: Date
): Interval[] | null {
  try {
    const seen = new Set<string>();
    const friendDays: WallParts[] = [];
    for (const instant of [dayStart, dayEnd]) {
      const w = getWallParts(instant, timeZone);
      const key = `${w.y}-${w.m}-${w.d}`;
      if (!seen.has(key)) {
        seen.add(key);
        friendDays.push(w);
      }
    }

    const windows: Interval[] = [];
    for (const day of friendDays) {
      const startAbs = wallTimeToUtc(timeZone, day.y, day.m, day.d, 7, 0);
      const endAbs = wallTimeToUtc(timeZone, day.y, day.m, day.d, 22, 0);
      const start = toMinutes(startAbs.toISOString(), dayStart, dayEnd);
      const end = toMinutes(endAbs.toISOString(), dayStart, dayEnd);
      if (end > start) windows.push({ start, end });
    }
    return windows;
  } catch {
    return null;
  }
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
export interface FriendAvailabilityResult {
  /** Merged shared-free-time blocks between the user and their friends. */
  blocks: SharedFreeBlock[];
  /** Friends who share availability (privacy-gated server-side). */
  friends: { id: string; name: string; avatar?: string }[];
  isLoading: boolean;
  isError: boolean;
}

export function useFriendAvailability(
  date: Date,
  events: EventBlock[]
): FriendAvailabilityResult {
  const { user } = useAuth();
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const dayKey = dayStart.toISOString();

  const { data, isLoading, isError } = useQuery({
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

  const blocks = useMemo(() => {
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

    const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const friendSlots: FriendFreeSlot[] = [];
    for (const friend of friends) {
      // Clip a remote friend's free time to *their* local 7:00-22:00 so we
      // never suggest hanging out while they're asleep.
      const windows =
        friend.timezone && friend.timezone !== viewerTz
          ? friendWakingWindows(friend.timezone, dayStart, dayEnd)
          : null;
      const free = freeFromBusy(
        busyByFriend.get(friend.id) ?? [],
        windows ?? undefined
      );
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

  return {
    blocks,
    friends: data?.friends ?? [],
    isLoading: !!user && isLoading,
    isError,
  };
}
