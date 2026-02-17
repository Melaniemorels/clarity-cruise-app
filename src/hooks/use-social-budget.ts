import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export type DailyLimitOption = 10 | 15 | 20 | 30 | "unlimited";

interface FeedSettings {
  daily_feed_minutes: number;
  allow_extensions: boolean;
}

interface TimeUsage {
  seconds_used: number;
}

// Fetch feed settings
export function useFeedSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["feed-settings", user?.id],
    queryFn: async (): Promise<FeedSettings> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("feed_settings")
        .select("daily_feed_minutes")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // If no settings exist, return defaults
        if (error.code === "PGRST116") {
          return { daily_feed_minutes: 15, allow_extensions: true };
        }
        throw error;
      }

      return {
        daily_feed_minutes: data.daily_feed_minutes ?? 15,
        allow_extensions: true, // Default until migration is applied
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}

// Fetch today's time usage
export function useTodayTimeUsage() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["time-usage", "FEED", today, user?.id],
    queryFn: async (): Promise<TimeUsage> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("time_usage")
        .select("seconds_used")
        .eq("user_id", user.id)
        .eq("module", "FEED")
        .eq("date", today)
        .single();

      if (error) {
        // If no usage exists for today, return 0
        if (error.code === "PGRST116") {
          return { seconds_used: 0 };
        }
        throw error;
      }

      return { seconds_used: data.seconds_used ?? 0 };
    },
    enabled: !!user,
    refetchInterval: 10000, // Refetch every 10 seconds to stay in sync
  });
}

// Update feed settings — also syncs time_goals.FEED to keep Focus Mode in sync
export function useUpdateFeedSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<FeedSettings>) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("feed_settings")
        .upsert({
          user_id: user.id,
          daily_feed_minutes: settings.daily_feed_minutes,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;

      // Keep time_goals.FEED in sync with feed_settings
      if (settings.daily_feed_minutes !== undefined) {
        await supabase
          .from("time_goals")
          .update({
            daily_minutes: settings.daily_feed_minutes === 0 ? 0 : settings.daily_feed_minutes,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("module", "FEED" as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-settings"] });
      queryClient.invalidateQueries({ queryKey: ["time-goals"] });
      queryClient.invalidateQueries({ queryKey: ["time-usage-all"] });
    },
  });
}

// Hook to track active time on feed
export function useSocialBudgetTracker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(false);
  const [localSecondsUsed, setLocalSecondsUsed] = useState(0);
  const [extensionMinutes, setExtensionMinutes] = useState(0);
  const lastSyncRef = useRef<number>(0);
  const accumulatedSecondsRef = useRef<number>(0);

  const { data: settings } = useFeedSettings();
  const { data: usage } = useTodayTimeUsage();

  const dailyLimitSeconds = settings?.daily_feed_minutes === 0 
    ? Infinity 
    : (settings?.daily_feed_minutes ?? 15) * 60;

  const totalLimitSeconds = dailyLimitSeconds + (extensionMinutes * 60);

  // Initialize local seconds from server data
  useEffect(() => {
    if (usage) {
      setLocalSecondsUsed(usage.seconds_used);
      accumulatedSecondsRef.current = 0;
    }
  }, [usage]);

  // Sync accumulated time to server
  const syncTimeToServer = useCallback(async () => {
    if (!user || accumulatedSecondsRef.current <= 0) return;

    const today = format(new Date(), "yyyy-MM-dd");
    const secondsToAdd = accumulatedSecondsRef.current;
    accumulatedSecondsRef.current = 0;

    try {
      // First try to get existing record
      const { data: existing } = await supabase
        .from("time_usage")
        .select("id, seconds_used")
        .eq("user_id", user.id)
        .eq("module", "FEED")
        .eq("date", today)
        .single();

      if (existing) {
        // Update existing record
        await supabase
          .from("time_usage")
          .update({ 
            seconds_used: existing.seconds_used + secondsToAdd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        // Create new record
        await supabase
          .from("time_usage")
          .insert({
            user_id: user.id,
            module: "FEED",
            date: today,
            seconds_used: secondsToAdd,
          });
      }

      lastSyncRef.current = Date.now();
    } catch (error) {
      // On error, add back to accumulated
      accumulatedSecondsRef.current += secondsToAdd;
      console.error("Failed to sync time usage:", error);
    }
  }, [user]);

  // Active time tracking
  useEffect(() => {
    if (!isActive || !user) return;

    const interval = setInterval(() => {
      setLocalSecondsUsed((prev) => {
        const newValue = prev + 1;
        accumulatedSecondsRef.current += 1;
        return newValue;
      });

      // Sync every 30 seconds
      if (Date.now() - lastSyncRef.current >= 30000) {
        syncTimeToServer();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      syncTimeToServer(); // Sync when stopping
    };
  }, [isActive, user, syncTimeToServer]);

  // Sync on visibility change (tab switch, etc.)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsActive(false);
        syncTimeToServer();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncTimeToServer]);

  const startTracking = useCallback(() => {
    setIsActive(true);
  }, []);

  const stopTracking = useCallback(() => {
    setIsActive(false);
    syncTimeToServer();
  }, [syncTimeToServer]);

  const addExtension = useCallback((minutes: number) => {
    setExtensionMinutes((prev) => prev + minutes);
  }, []);

  const resetExtensions = useCallback(() => {
    setExtensionMinutes(0);
  }, []);

  const isLimitReached = dailyLimitSeconds !== Infinity && localSecondsUsed >= totalLimitSeconds;
  const remainingSeconds = Math.max(0, totalLimitSeconds - localSecondsUsed);
  const progressPercent = dailyLimitSeconds === Infinity 
    ? 0 
    : Math.min(100, (localSecondsUsed / dailyLimitSeconds) * 100);

  return {
    isActive,
    localSecondsUsed,
    dailyLimitSeconds,
    totalLimitSeconds,
    remainingSeconds,
    progressPercent,
    isLimitReached,
    extensionMinutes,
    allowExtensions: settings?.allow_extensions ?? true,
    isUnlimited: settings?.daily_feed_minutes === 0,
    startTracking,
    stopTracking,
    addExtension,
    resetExtensions,
    syncTimeToServer,
  };
}

// Format seconds to mm:ss
export function formatTimeDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Format seconds to "X min"
export function formatMinutesDisplay(seconds: number): string {
  const mins = Math.ceil(seconds / 60);
  return `${mins} min`;
}
