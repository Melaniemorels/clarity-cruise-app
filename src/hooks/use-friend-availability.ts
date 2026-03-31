import { useMemo } from "react";
import { isSameDay } from "date-fns";

export interface FriendFreeSlot {
  friendName: string;
  friendAvatar?: string;
  startMinute: number; // minutes from midnight
  endMinute: number;
}

export interface SharedFreeBlock {
  friendName: string;
  friendAvatar?: string;
  startMinute: number;
  endMinute: number;
}

// Simulated friend data — will be replaced with real data later
const SIMULATED_FRIENDS = [
  { name: "Emma", avatar: undefined },
  { name: "Lucas", avatar: undefined },
  { name: "Sofía", avatar: undefined },
];

// Generate simulated free blocks for friends on a given date
function getSimulatedFriendSlots(date: Date): FriendFreeSlot[] {
  // Use date as seed for deterministic but varied results
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const slots: FriendFreeSlot[] = [];

  SIMULATED_FRIENDS.forEach((friend, idx) => {
    // Each friend gets 1-2 free blocks per day, seeded by date
    const base = ((seed * (idx + 3)) % 14) + 7; // hour between 7-20
    const duration = ((seed * (idx + 7)) % 3 + 1) * 60; // 1-3 hours
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
 * Returns blocks where both are available, positioned for the timeline.
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

    // 2. Build user's free intervals (only between 7am-22pm for relevance)
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

    // 4. Find overlaps — pick at most 2 to keep it calm
    const shared: SharedFreeBlock[] = [];

    for (const freeBlock of userFree) {
      for (const friendSlot of friendSlots) {
        const overlapStart = Math.max(freeBlock.start, friendSlot.startMinute);
        const overlapEnd = Math.min(freeBlock.end, friendSlot.endMinute);

        // Minimum 30 minutes of shared free time to suggest
        if (overlapEnd - overlapStart >= 30) {
          shared.push({
            friendName: friendSlot.friendName,
            friendAvatar: friendSlot.friendAvatar,
            startMinute: overlapStart,
            endMinute: overlapEnd,
          });
        }
      }
    }

    // Limit to 2 suggestions max to keep it non-intrusive
    return shared.slice(0, 2);
  }, [date, events]);
}
