import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import i18n from "@/i18n";

export type SectionVisibility = "public" | "private";

export interface SectionVisibilitySettings {
  posts_visibility: SectionVisibility;
  calendar_visibility: SectionVisibility;
  wellness_visibility: SectionVisibility;
}

const DEFAULT_SETTINGS: SectionVisibilitySettings = {
  posts_visibility: "public",
  calendar_visibility: "private",
  wellness_visibility: "private",
};

interface RawSectionVisibility {
  posts_visibility: string;
  calendar_visibility: string;
  wellness_visibility: string;
}

export function useSectionVisibility() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SectionVisibilitySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Use REST API directly since types may not be synced
      const { data, error } = await (supabase
        .from("profile_section_visibility" as any)
        .select("posts_visibility, calendar_visibility, wellness_visibility")
        .eq("user_id", user.id)
        .single() as any);

      if (error) {
        // If no record exists, create one with defaults
        if (error.code === "PGRST116") {
          const { error: insertError } = await (supabase
            .from("profile_section_visibility" as any)
            .insert({ user_id: user.id } as any) as any);

          if (insertError) throw insertError;
          setSettings(DEFAULT_SETTINGS);
        } else {
          throw error;
        }
      } else if (data) {
        const rawData = data as RawSectionVisibility;
        setSettings({
          posts_visibility: (rawData.posts_visibility as SectionVisibility) || "public",
          calendar_visibility: (rawData.calendar_visibility as SectionVisibility) || "private",
          wellness_visibility: (rawData.wellness_visibility as SectionVisibility) || "private",
        });
      }
    } catch (error) {
      console.error("Error fetching section visibility:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = useCallback(
    async (key: keyof SectionVisibilitySettings, value: SectionVisibility) => {
      if (!user) return false;

      // Optimistic update
      const previousSettings = { ...settings };
      setSettings((prev) => ({ ...prev, [key]: value }));

      try {
        const { error } = await (supabase
          .from("profile_section_visibility" as any)
          .update({ [key]: value } as any)
          .eq("user_id", user.id) as any);

        if (error) throw error;
        // Invalidate queries that depend on visibility settings
        queryClient.invalidateQueries({ queryKey: ["target-profile-privacy"] });
        queryClient.invalidateQueries({ queryKey: ["posts"] });
        queryClient.invalidateQueries({ queryKey: ["entries"] });
        return true;
      } catch (error) {
        console.error("Error updating section visibility:", error);
        // Revert on error
        setSettings(previousSettings);
        toast.error(i18n.t('errors.generic'));
        return false;
      }
    },
    [user, settings, queryClient]
  );

  return {
    settings,
    loading,
    updateSetting,
    refetch: fetchSettings,
  };
}

/**
 * Hook to fetch visibility settings for a specific user (for viewing their profile)
 */
export function useProfileSectionVisibility(userId: string | undefined) {
  const [settings, setSettings] = useState<SectionVisibilitySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await (supabase
          .from("profile_section_visibility" as any)
          .select("posts_visibility, calendar_visibility, wellness_visibility")
          .eq("user_id", userId)
          .single() as any);

        if (error) {
          // No settings found, use defaults
          if (error.code === "PGRST116") {
            setSettings(DEFAULT_SETTINGS);
          } else {
            throw error;
          }
        } else if (data) {
          const rawData = data as RawSectionVisibility;
          setSettings({
            posts_visibility: (rawData.posts_visibility as SectionVisibility) || "public",
            calendar_visibility: (rawData.calendar_visibility as SectionVisibility) || "private",
            wellness_visibility: (rawData.wellness_visibility as SectionVisibility) || "private",
          });
        }
      } catch (error) {
        console.error("Error fetching profile section visibility:", error);
        // Default to most restrictive on error
        setSettings({
          posts_visibility: "private",
          calendar_visibility: "private",
          wellness_visibility: "private",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [userId]);

  return { settings, loading };
}
