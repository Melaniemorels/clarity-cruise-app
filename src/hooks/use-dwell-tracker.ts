import { useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const DWELL_THRESHOLD_MS = 1500; // Only track if user pauses > 1.5s
const BATCH_INTERVAL_MS = 10_000; // Flush batch every 10s

interface DwellEntry {
  item_id?: string;
  category?: string;
  dwell_ms: number;
  source: string;
}

/**
 * Tracks dwell time on items using IntersectionObserver.
 * Batches events and sends them to the backend periodically.
 */
export function useDwellTracker(source: string = "explore") {
  const { session } = useAuth();
  const batchRef = useRef<DwellEntry[]>([]);
  const visibleItemsRef = useRef<Map<string, { start: number; category?: string }>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flush = useCallback(async () => {
    if (!session?.access_token || batchRef.current.length === 0) return;

    const events = [...batchRef.current];
    batchRef.current = [];

    try {
      await Promise.all(
        events.map((ev) =>
          fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contextual-recommendations`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ mode: "log_dwell", ...ev }),
            }
          ).catch(() => {})
        )
      );
    } catch {
      // Silent fail — dwell tracking is non-critical
    }
  }, [session]);

  // Periodic flush
  useEffect(() => {
    flushTimerRef.current = setInterval(flush, BATCH_INTERVAL_MS);
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      flush(); // Final flush on unmount
    };
  }, [flush]);

  /** Call when an item enters the viewport */
  const onItemVisible = useCallback((itemId: string, category?: string) => {
    visibleItemsRef.current.set(itemId, { start: Date.now(), category });
  }, []);

  /** Call when an item leaves the viewport */
  const onItemHidden = useCallback(
    (itemId: string) => {
      const entry = visibleItemsRef.current.get(itemId);
      if (!entry) return;
      visibleItemsRef.current.delete(itemId);

      const dwellMs = Date.now() - entry.start;
      if (dwellMs >= DWELL_THRESHOLD_MS) {
        batchRef.current.push({
          item_id: itemId,
          category: entry.category,
          dwell_ms: dwellMs,
          source,
        });
      }
    },
    [source]
  );

  /** Track category-level dwell (for section scroll) */
  const onCategoryVisible = useCallback((category: string) => {
    const key = `cat:${category}`;
    visibleItemsRef.current.set(key, { start: Date.now(), category });
  }, []);

  const onCategoryHidden = useCallback(
    (category: string) => {
      const key = `cat:${category}`;
      const entry = visibleItemsRef.current.get(key);
      if (!entry) return;
      visibleItemsRef.current.delete(key);

      const dwellMs = Date.now() - entry.start;
      if (dwellMs >= DWELL_THRESHOLD_MS) {
        batchRef.current.push({
          category,
          dwell_ms: dwellMs,
          source,
        });
      }
    },
    [source]
  );

  return { onItemVisible, onItemHidden, onCategoryVisible, onCategoryHidden, flush };
}
