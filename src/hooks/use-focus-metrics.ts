import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfWeek, addDays } from "date-fns";
import { useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────
export type AppModule = "FEED" | "EXPLORE";

interface TimeGoal {
  module: AppModule | null; // null = overall daily cap
  daily_minutes: number;
}

interface TimeUsageRow {
  date: string;
  module: string;
  seconds_used: number;
}

interface HealthDailyRow {
  steps: number;
  workout_minutes: number;
  active_calories: number;
  distance_km: number;
  sleep_minutes: number;
}

interface HealthGoalRow {
  metric: string;
  target: number;
  period: string;
}

export interface ModuleMetrics {
  usedSeconds: number;
  limitMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  progress: number; // 0–1, clamped
}

export interface HealthMetrics {
  steps: { value: number; goal: number };
  workout: { value: number; goal: number };
  calories: { value: number; goal: number };
  sleep: { value: number; goal: number };
}

export interface WeeklyDayData {
  dayLabel: string;
  savedMinutes: number;
  goalMinutes: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getTodayDateString(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function getWeekDates(): string[] {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStart, i), "yyyy-MM-dd")
  );
}

// ─── Hook: Time Goals (limits) ──────────────────────────────────────────
export function useTimeGoals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["time-goals", user?.id],
    queryFn: async (): Promise<TimeGoal[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("time_goals")
        .select("module, daily_minutes")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []).map((row: any) => ({
        module: row.module ?? null,
        daily_minutes: safeNumber(row.daily_minutes, 45),
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Hook: Today's time usage (all modules) ─────────────────────────────
export function useTodayAllModulesUsage() {
  const { user } = useAuth();
  const today = getTodayDateString();

  return useQuery({
    queryKey: ["time-usage-all", today, user?.id],
    queryFn: async (): Promise<TimeUsageRow[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("time_usage")
        .select("date, module, seconds_used")
        .eq("user_id", user.id)
        .eq("date", today);

      if (error) throw error;
      return (data || []).map((row: any) => ({
        date: row.date,
        module: row.module,
        seconds_used: safeNumber(row.seconds_used),
      }));
    },
    enabled: !!user,
    refetchInterval: 10_000,
  });
}

// ─── Hook: This week's usage (for weekly chart) ─────────────────────────
export function useWeeklyUsage() {
  const { user } = useAuth();
  const weekDates = getWeekDates();

  return useQuery({
    queryKey: ["time-usage-week", weekDates[0], user?.id],
    queryFn: async (): Promise<TimeUsageRow[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("time_usage")
        .select("date, module, seconds_used")
        .eq("user_id", user.id)
        .gte("date", weekDates[0])
        .lte("date", weekDates[6]);

      if (error) throw error;
      return (data || []).map((row: any) => ({
        date: row.date,
        module: row.module,
        seconds_used: safeNumber(row.seconds_used),
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Hook: Health daily data ─────────────────────────────────────────────
export function useTodayHealth() {
  const { user } = useAuth();
  const today = getTodayDateString();

  return useQuery({
    queryKey: ["health-daily-today", today, user?.id],
    queryFn: async (): Promise<HealthDailyRow | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("health_daily")
        .select("steps, workout_minutes, active_calories, distance_km, sleep_minutes")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as any;
      return {
        steps: safeNumber(row.steps),
        workout_minutes: safeNumber(row.workout_minutes),
        active_calories: safeNumber(row.active_calories),
        distance_km: safeNumber(row.distance_km),
        sleep_minutes: safeNumber(row.sleep_minutes),
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Hook: Health goals ──────────────────────────────────────────────────
export function useHealthGoals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["health-goals", user?.id],
    queryFn: async (): Promise<HealthGoalRow[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("goals_health")
        .select("metric, target, period")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []).map((row: any) => ({
        metric: row.metric,
        target: safeNumber(row.target),
        period: row.period,
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Hook: Update time goal ──────────────────────────────────────────────
export function useUpdateTimeGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ module, daily_minutes }: { module: AppModule | null; daily_minutes: number }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("time_goals")
        .update({ daily_minutes, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("module", module as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-goals"] });
    },
  });
}

// ─── Composite hook: Focus Mode metrics ──────────────────────────────────
export function useFocusMetrics() {
  const { data: goals = [], isLoading: goalsLoading } = useTimeGoals();
  const { data: todayUsage = [], isLoading: usageLoading } = useTodayAllModulesUsage();
  const { data: weekUsage = [], isLoading: weekLoading } = useWeeklyUsage();
  const { data: healthData, isLoading: healthLoading } = useTodayHealth();
  const { data: healthGoals = [], isLoading: healthGoalsLoading } = useHealthGoals();

  const isLoading = goalsLoading || usageLoading;
  const isWeekLoading = weekLoading;

  // ── Goals lookup ──
  const overallGoal = goals.find((g) => g.module === null);
  const feedGoal = goals.find((g) => g.module === "FEED");
  const exploreGoal = goals.find((g) => g.module === "EXPLORE");

  const dailyLimitMinutes = safeNumber(overallGoal?.daily_minutes, 45);
  const feedLimitMinutes = safeNumber(feedGoal?.daily_minutes, 10);
  const exploreLimitMinutes = safeNumber(exploreGoal?.daily_minutes, 15);

  // ── Usage lookup ──
  const getModuleSeconds = useCallback(
    (mod: string): number => {
      const row = todayUsage.find((u) => u.module === mod);
      return safeNumber(row?.seconds_used);
    },
    [todayUsage]
  );

  const feedUsedSeconds = getModuleSeconds("FEED");
  const exploreUsedSeconds = getModuleSeconds("EXPLORE");
  const totalUsedSeconds = todayUsage.reduce(
    (acc, u) => acc + safeNumber(u.seconds_used),
    0
  );

  // ── Derived metrics ──
  const totalUsedMinutes = Math.floor(totalUsedSeconds / 60);
  const feedUsedMinutes = Math.floor(feedUsedSeconds / 60);
  const exploreUsedMinutes = Math.floor(exploreUsedSeconds / 60);

  const remainingMinutes = Math.max(0, dailyLimitMinutes - totalUsedMinutes);

  const overallProgress = clamp(
    dailyLimitMinutes > 0 ? totalUsedMinutes / dailyLimitMinutes : 0,
    0,
    1
  );
  const feedProgress = clamp(
    feedLimitMinutes > 0 ? feedUsedMinutes / feedLimitMinutes : 0,
    0,
    1
  );
  const exploreProgress = clamp(
    exploreLimitMinutes > 0 ? exploreUsedMinutes / exploreLimitMinutes : 0,
    0,
    1
  );

  // ── Module metrics (clean interface) ──
  const feed: ModuleMetrics = {
    usedSeconds: feedUsedSeconds,
    limitMinutes: feedLimitMinutes,
    usedMinutes: feedUsedMinutes,
    remainingMinutes: Math.max(0, feedLimitMinutes - feedUsedMinutes),
    progress: feedProgress,
  };

  const explore: ModuleMetrics = {
    usedSeconds: exploreUsedSeconds,
    limitMinutes: exploreLimitMinutes,
    usedMinutes: exploreUsedMinutes,
    remainingMinutes: Math.max(0, exploreLimitMinutes - exploreUsedMinutes),
    progress: exploreProgress,
  };

  // ── Weekly data ──
  const weekDates = getWeekDates();
  const dayLabelsShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const weeklyData: WeeklyDayData[] = weekDates.map((dateStr, i) => {
    const dayUsage = weekUsage
      .filter((u) => u.date === dateStr)
      .reduce((acc, u) => acc + safeNumber(u.seconds_used), 0);
    const dayUsedMinutes = Math.floor(dayUsage / 60);
    // "Time saved" = max(0, dailyCap - usedMinutes)
    const saved = Math.max(0, dailyLimitMinutes - dayUsedMinutes);
    return {
      dayLabel: dayLabelsShort[i],
      savedMinutes: saved,
      goalMinutes: dailyLimitMinutes,
    };
  });

  const totalWeeklySaved = weeklyData.reduce(
    (acc, d) => acc + d.savedMinutes,
    0
  );

  // ── Health metrics ──
  const stepsGoal = healthGoals.find((g) => g.metric === "steps");
  const workoutGoal = healthGoals.find((g) => g.metric === "workout_minutes");
  const caloriesGoal = healthGoals.find((g) => g.metric === "active_calories");
  const sleepGoal = healthGoals.find((g) => g.metric === "sleep_minutes");

  const health: HealthMetrics = {
    steps: {
      value: safeNumber(healthData?.steps),
      goal: safeNumber(stepsGoal?.target, 10000),
    },
    workout: {
      value: safeNumber(healthData?.workout_minutes),
      goal: safeNumber(workoutGoal?.target, 60),
    },
    calories: {
      value: safeNumber(healthData?.active_calories),
      goal: safeNumber(caloriesGoal?.target, 500),
    },
    sleep: {
      value: safeNumber(healthData?.sleep_minutes),
      goal: safeNumber(sleepGoal?.target, 480),
    },
  };

  // Dev-only logging
  if (import.meta.env.DEV) {
    console.debug("[FocusMetrics]", {
      dailyLimitMinutes,
      totalUsedMinutes,
      remainingMinutes,
      overallProgress,
      feedUsedMinutes,
      exploreUsedMinutes,
      health,
    });
  }

  return {
    isLoading,
    isWeekLoading,
    isHealthLoading: healthLoading || healthGoalsLoading,

    // Overall
    dailyLimitMinutes,
    totalUsedMinutes,
    remainingMinutes,
    overallProgress,

    // Per-module
    feed,
    explore,

    // Weekly
    weeklyData,
    totalWeeklySaved,

    // Health
    health,
  };
}
