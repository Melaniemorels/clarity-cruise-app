import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

  return useQuery({
    queryKey: ["recommendations", goal, user?.id],
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
          body: JSON.stringify({ goal: goal === "auto" ? null : goal }),
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: RecommendationGoal) => {
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
          body: JSON.stringify({ 
            goal: goal === "auto" ? null : goal,
            forceRefresh: true,
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
      // Use fetch directly since types aren't synced yet
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/media_consent?user_id=eq.${user!.id}&select=*`,
        {
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 406) return null;
        throw new Error("Failed to fetch consent");
      }

      const data = await response.json();
      return data?.[0] as MediaConsent | null;
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

      // Check if consent record exists
      const checkResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/media_consent?user_id=eq.${user!.id}&select=id`,
        {
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${session.access_token}`,
          },
        }
      );

      const existing = await checkResponse.json();

      if (existing && existing.length > 0) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/media_consent?user_id=eq.${user!.id}`,
          {
            method: "PATCH",
            headers: {
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              "Authorization": `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              ...consent,
              consent_given_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          }
        );

        if (!response.ok) throw new Error("Failed to update consent");
      } else {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/media_consent`,
          {
            method: "POST",
            headers: {
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              "Authorization": `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              user_id: user!.id,
              ...consent,
              consent_given_at: new Date().toISOString(),
            }),
          }
        );

        if (!response.ok) throw new Error("Failed to create consent");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-consent"] });
    },
  });
}