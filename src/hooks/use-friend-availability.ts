import { useMemo } from "react";
import { isSameDay } from "date-fns";

export interface FriendFreeSlot {
  friendName: string;
  friendAvatar?: string;
  startMinute: number;
  endMinute: number;
}

export interface SharedFreeBlock {
  friends: { name: string; avatar?: string }[];
  startMinute: number;
  endMinute: number;
}

// Simulated friend data — will be replaced with real data later
const SIMULATED_FRIENDS = [
  { name: "Emma", avatar: undefined },
  { name: "Lucas", avatar: undefined },
  { name: "Sofía", avatar: undefined },
  { name: "Noah", avatar: undefined },
  { name: "Mia", avatar: undefined },
];

// Generate simulated free blocks for friends on a given date
function getSimulatedFriendSlots(date: Date): FriendFreeSlot[] {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const slots: FriendFreeSlot[] = [];

  SIMULATED_FRIENDS.forEach((friend, idx) => {
    // Each friend gets 1-2 free blocks per day, seeded by date
    const base = ((seed * (idx + 3)) % 14) + 7;
    const duration = ((seed * (idx + 7)) % 3 + 1) * 60;
    const startMinute = base * 60;
    const endMinute = Math.min(startMinute + duration, 23 * 60);

    slots.push({
      friendName: friend.name,
      friendAvatar: friend.avatar,
      startMinute,
      endMinute,
    });
  });

  return slots;
}

interface EventBlock {
  starts_at: string;
  ends_at: string;
}

/**
 * Detects shared free time between the user and simulated friends.
 * Groups overlapping friends into single blocks.
 */
export function useFriendAvailability(
  date: Date,
  events: EventBlock[]
): SharedFreeBlock[] {
  return useMemo(() => {
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
      })
      .sort((a, b) => a.start - b.start);

    // 2. Build user's free intervals (only between 7am-22pm)
    const DAY_START = 7 * 60;
    const DAY_END = 22 * 60;
    const userFree: { start: number; end: number }[] = [];
    let cursor = DAY_START;

    for (const busy of busyIntervals) {
      if (busy.start > cursor) {
        userFree.push({ start: cursor, end: Math.min(busy.start, DAY_END) });
      }
      cursor = Math.max(cursor, busy.end);
    }
    if (cursor < DAY_END) {
      userFree.push({ start: cursor, end: DAY_END });
    }

    // 3. Get friend availability
    const friendSlots = getSimulatedFriendSlots(date);

    // 4. Find all individual overlaps
    const rawOverlaps: { friend: { name: string; avatar?: string }; start: number; end: number }[] = [];

    for (const freeBlock of userFree) {
      for (const friendSlot of friendSlots) {
        const overlapStart = Math.max(freeBlock.start, friendSlot.startMinute);
        const overlapEnd = Math.min(freeBlock.end, friendSlot.endMinute);

        if (overlapEnd - overlapStart >= 30) {
          rawOverlaps.push({
            friend: { name: friendSlot.friendName, avatar: friendSlot.friendAvatar },
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
        if (!current.friends.some(f => f.name === overlap.friend.name)) {
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
  }, [date, events]);
}
