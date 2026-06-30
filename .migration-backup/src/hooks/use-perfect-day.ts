import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

export type ActivityType = "work" | "movement" | "nutrition" | "rest" | "mindfulness";
export type Period = "morning" | "midday" | "afternoon" | "evening";
export type EnergyLevel = "low" | "medium" | "high";

export interface Activity {
  type: ActivityType;
  title: string;
  description: string;
  duration?: string;
}

export interface TimeBlock {
  period: Period;
  activities: Activity[];
}

export interface PerfectDayResponse {
  energyLevel: EnergyLevel;
  sleepHours: number;
  blocks: TimeBlock[];
  closing: {
    type: "reflection" | "affirmation";
    text: string;
  };
  generatedAt: string;
}

export function usePerfectDay() {
  const { user, session } = useAuth();
  const { i18n } = useTranslation();

  return useQuery({
    queryKey: ["perfect-day", user?.id, i18n.language],
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
          body: JSON.stringify({
            userLanguage: i18n.language,
          }),
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
