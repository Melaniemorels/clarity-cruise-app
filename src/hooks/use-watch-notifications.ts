import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export interface WatchNotificationData {
  notification_type: "focus" | "recovery" | "transition" | "calendar";
  title: string;
  body: string;
  context_signals: {
    stress_level: "low" | "moderate" | "high";
    energy_level: "low" | "moderate" | "high";
    calendar_load: "light" | "moderate" | "heavy";
    reasoning: string;
  };
}

export interface GenerateResult {
  notifications: WatchNotificationData[];
  todayCount: number;
  signals: {
    health: { sleepHours: number; hasActivityData: boolean };
    calendar: { eventCount: number; load: string };
  };
}

export const useWatchNotifications = () => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-watch-notifications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ language: i18n.language }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          toast.error("Rate limit reached. Please try again later.");
          throw new Error("Rate limited");
        }
        if (response.status === 402) {
          toast.error("AI service temporarily unavailable.");
          throw new Error("Payment required");
        }
        throw new Error(errData.error || "Failed to generate notifications");
      }

      const data: GenerateResult = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      if (import.meta.env.DEV) {
        console.error("Watch notification generation error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayNotifications = async () => {
    if (!user) return [];

    const today = new Date().toISOString().split("T")[0];
    const { data, error: fetchError } = await supabase
      .from("watch_notifications" as any)
      .select("*")
      .eq("user_id", user.id)
      .gte("generated_at", `${today}T00:00:00`)
      .order("generated_at", { ascending: false });

    if (fetchError) {
      if (import.meta.env.DEV) {
        console.error("Error fetching watch notifications:", fetchError);
      }
      return [];
    }

    return data || [];
  };

  return {
    generate,
    fetchTodayNotifications,
    loading,
    result,
    error,
  };
};
