import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export interface WorkoutSession {
  id: string;
  type: string;
  minutes: number;
  started_at: string;
  notes: string | null;
  rpe: number | null;
}

export interface WorkoutBreakdown {
  totalMinutes: number;
  sessions: WorkoutSession[];
  byType: { type: string; minutes: number; count: number }[];
}

export function useTodayWorkoutSessions() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["workout-sessions-today", today, user?.id],
    queryFn: async (): Promise<WorkoutBreakdown> => {
      if (!user) return { totalMinutes: 0, sessions: [], byType: [] };

      const startOfDay = `${today}T00:00:00`;
      const endOfDay = `${today}T23:59:59`;

      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, type, minutes, started_at, notes, rpe")
        .eq("user_id", user.id)
        .gte("started_at", startOfDay)
        .lte("started_at", endOfDay)
        .order("started_at", { ascending: true });

      if (error) throw error;

      const sessions: WorkoutSession[] = (data || []).map((s: any) => ({
        id: s.id,
        type: s.type || "general",
        minutes: s.minutes || 0,
        started_at: s.started_at,
        notes: s.notes,
        rpe: s.rpe,
      }));

      const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);

      // Group by type
      const typeMap = new Map<string, { minutes: number; count: number }>();
      for (const s of sessions) {
        const existing = typeMap.get(s.type) || { minutes: 0, count: 0 };
        typeMap.set(s.type, {
          minutes: existing.minutes + s.minutes,
          count: existing.count + 1,
        });
      }

      const byType = Array.from(typeMap.entries())
        .map(([type, data]) => ({ type, ...data }))
        .sort((a, b) => b.minutes - a.minutes);

      return { totalMinutes, sessions, byType };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });
}
