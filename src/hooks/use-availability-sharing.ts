import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AvailabilitySharingRow {
  user_id: string;
  share_free_busy_with_friends: boolean;
  show_friend_match_suggestions: boolean;
  updated_at: string;
}

export function useAvailabilitySharing() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["availability-sharing", user?.id],
    queryFn: async (): Promise<AvailabilitySharingRow> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("availability_sharing")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) return data as AvailabilitySharingRow;

      const { data: inserted, error: insErr } = await supabase
        .from("availability_sharing")
        .insert({
          user_id: user.id,
          share_free_busy_with_friends: false,
          show_friend_match_suggestions: true,
        })
        .select()
        .single();

      if (insErr) throw insErr;
      return inserted as AvailabilitySharingRow;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useUpdateAvailabilitySharing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: {
      share_free_busy_with_friends?: boolean;
      show_friend_match_suggestions?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("availability_sharing").upsert(
        {
          user_id: user.id,
          ...patch,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability-sharing"] });
      queryClient.invalidateQueries({ queryKey: ["shared-availability"] });
    },
  });
}
