import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import type { AppModule } from "@/hooks/use-focus-metrics";

/**
 * Tracks active screen time for any module (FEED, EXPLORE, etc).
 * - Counts seconds only while active and in foreground
 * - Syncs to time_usage table every 30s + on pause/unmount
 * - Pauses on visibilitychange (background)
 */
export function useModuleTimeTracker(module: AppModule) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(false);
  const accumulatedRef = useRef(0);
  const lastSyncRef = useRef(Date.now());

  const syncToServer = useCallback(async () => {
    if (!user || accumulatedRef.current <= 0) return;

    const today = format(new Date(), "yyyy-MM-dd");
    const toAdd = accumulatedRef.current;
    accumulatedRef.current = 0;

    try {
      const { data: existing } = await supabase
        .from("time_usage")
        .select("id, seconds_used")
        .eq("user_id", user.id)
        .eq("module", module)
        .eq("date", today)
        .single();

      if (existing) {
        await supabase
          .from("time_usage")
          .update({
            seconds_used: existing.seconds_used + toAdd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("time_usage").insert({
          user_id: user.id,
          module,
          date: today,
          seconds_used: toAdd,
        });
      }

      lastSyncRef.current = Date.now();

      // Invalidate usage queries so other components refresh
      queryClient.invalidateQueries({ queryKey: ["time-usage-all"] });
      queryClient.invalidateQueries({ queryKey: ["time-usage-week"] });
    } catch (error) {
      // Restore on failure
      accumulatedRef.current += toAdd;
      if (import.meta.env.DEV) {
        console.error(`[ModuleTracker:${module}] sync failed:`, error);
      }
    }
  }, [user, module, queryClient]);

  // Tick every second while active
  useEffect(() => {
    if (!isActive || !user) return;

    const interval = setInterval(() => {
      accumulatedRef.current += 1;

      // Sync every 30s
      if (Date.now() - lastSyncRef.current >= 30_000) {
        syncToServer();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      syncToServer();
    };
  }, [isActive, user, syncToServer]);

  // Pause on background
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        setIsActive(false);
        syncToServer();
      }
    };

    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [syncToServer]);

  const start = useCallback(() => setIsActive(true), []);
  const stop = useCallback(() => {
    setIsActive(false);
    syncToServer();
  }, [syncToServer]);

  return { start, stop, isActive };
}
