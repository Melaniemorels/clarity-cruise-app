import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export type ActivityType = "work" | "movement" | "nutrition" | "rest" | "mindfulness";
export type Period = "morning" | "midday" | "afternoon" | "evening";

export interface Activity {
  type: ActivityType;
  title: string;
  description: string;
  duration?: string;
  icon: string;
}

export interface TimeBlock {
  period: Period;
  icon: string;
  activities: Activity[];
}

export interface PerfectDayResponse {
  greeting: string;
  intention: string;
  blocks: TimeBlock[];
  closing: {
    type: "reflection" | "affirmation";
    text: string;
  };
  generatedAt: string;
}

export function usePerfectDay() {
  const { user, session } = useAuth();

  return useQuery({
    queryKey: ["perfect-day", user?.id],
    queryFn: async (): Promise<PerfectDayResponse> => {
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-perfect-day`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate perfect day");
      }

      return response.json();
    },
    enabled: !!user && !!session,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}
