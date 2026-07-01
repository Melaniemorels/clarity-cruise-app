import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

export type RecommendationGoal = "focus" | "energy" | "calm" | "recovery" | "motivation" | "sleep" | "auto";
export type RecommendationType = "playlist" | "podcast" | "ambient" | "guided";
export type RecommendationMood = "calm" | "energizing" | "focused" | "uplifting" | "relaxing";

export interface Recommendation {
  type: RecommendationType;
  title: string;
  description: string;
  duration: string;
  mood: RecommendationMood;
  spotifyUri?: string;
  externalUrl?: string;
  tags: string[];
}

export interface RecommendationResponse {
  recommendations: Recommendation[];
  context: string;
  signals: Record<string, unknown>;
  cached: boolean;
}

export interface MediaConsent {
  id: string;
  user_id: string;
  share_media_preferences: boolean;
  share_health_data: boolean;
  share_calendar_patterns: boolean;
  consent_given_at: string | null;
  consent_version: string;
  created_at: string;
  updated_at: string;
}

export function useRecommendations(goal: RecommendationGoal = "auto") {
  const { user, session } = useAuth();
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] || 'en';

  return useQuery({
    queryKey: ["recommendations", goal, user?.id, language],
    queryFn: async (): Promise<RecommendationResponse> => {
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-recommendations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ goal: goal === "auto" ? null : goal, language }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch recommendations");
      }

      return response.json();
    },
    enabled: !!user && !!session,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useRefreshRecommendations() {
  const { session } = useAuth();
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: RecommendationGoal) => {
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const language = i18n.language?.split('-')[0] || 'en';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-recommendations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            goal: goal === "auto" ? null : goal,
            forceRefresh: true,
            language,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to refresh recommendations");
      }

      return response.json();
    },
    onSuccess: (_, goal) => {
      queryClient.invalidateQueries({ queryKey: ["recommendations", goal] });
    },
  });
}

export function useMediaConsent() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["media-consent", user?.id],
    queryFn: async (): Promise<MediaConsent | null> => {
      const { data, error } = await supabase
        .from("media_consent")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw new Error(error.message || "Failed to fetch consent");
      return (data as MediaConsent | null) ?? null;
    },
    enabled: !!user,
  });
}

export function useUpdateMediaConsent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (consent: {
      share_media_preferences?: boolean;
      share_health_data?: boolean;
      share_calendar_patterns?: boolean;
    }) => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("media_consent")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      const nowIso = new Date().toISOString();

      if (existing) {
        const { error } = await supabase
          .from("media_consent")
          .update({
            ...consent,
            consent_given_at: nowIso,
            updated_at: nowIso,
          })
          .eq("user_id", user!.id);

        if (error) throw new Error("Failed to update consent");
      } else {
        const { error } = await supabase.from("media_consent").insert({
          user_id: user!.id,
          ...consent,
          consent_given_at: nowIso,
        });

        if (error) throw new Error("Failed to create consent");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-consent"] });
    },
  });
}