import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export type FollowStatus = "none" | "pending" | "accepted" | "blocked";

interface FollowRelation {
  id: string;
  status: string;
}

// Get the follow status between current user and target user
export function useFollowStatus(targetUserId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["follow-status", user?.id, targetUserId],
    queryFn: async (): Promise<FollowStatus> => {
      if (!user || !targetUserId || user.id === targetUserId) return "none";

      // Use type assertion for status column not yet in generated types
      const { data, error } = await (supabase
        .from("follows")
        .select("id, status")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle() as any);

      if (error) throw error;
      if (!data) return "none";
      
      const relation = data as FollowRelation;
      return (relation.status as FollowStatus) || "accepted";
    },
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
    staleTime: 1000 * 30,
  });
}

// Check if target user follows current user (for mutual follow detection)
export function useIsFollowedBy(targetUserId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["followed-by", user?.id, targetUserId],
    queryFn: async (): Promise<boolean> => {
      if (!user || !targetUserId || user.id === targetUserId) return false;

      // Use type assertion for status column
      const { data, error } = await (supabase as any)
        .from("follows")
        .select("id, status")
        .eq("follower_id", targetUserId)
        .eq("following_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
    staleTime: 1000 * 60,
  });
}

// Follow mutation with proper state handling
export function useFollowMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      targetUserId,
      targetIsPrivate,
    }: {
      targetUserId: string;
      targetIsPrivate: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const newStatus = targetIsPrivate ? "pending" : "accepted";

      // Upsert to handle both new follows and re-follows after unfollow
      const { data, error } = await (supabase
        .from("follows")
        .upsert(
          {
            follower_id: user.id,
            following_id: targetUserId,
            status: newStatus,
          } as any,
          {
            onConflict: "follower_id,following_id",
          }
        )
        .select()
        .single() as any);

      if (error) throw error;

      // Create notification for follow request if private
      if (targetIsPrivate) {
        await (supabase as any).from("notifications").insert({
          user_id: targetUserId,
          actor_id: user.id,
          type: "follow_request",
          message: "requested to follow you",
        });
      } else {
        // Create notification for new follower if public
        await (supabase as any).from("notifications").insert({
          user_id: targetUserId,
          actor_id: user.id,
          type: "new_follower",
          message: "started following you",
        });
      }

      return { status: newStatus, targetUserId };
    },
    onMutate: async ({ targetUserId, targetIsPrivate }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["follow-status", user?.id, targetUserId] });
      
      const previousStatus = queryClient.getQueryData(["follow-status", user?.id, targetUserId]);
      const newStatus = targetIsPrivate ? "pending" : "accepted";
      
      queryClient.setQueryData(["follow-status", user?.id, targetUserId], newStatus);

      return { previousStatus };
    },
    onError: (error, variables, context) => {
      // Revert on error
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(
          ["follow-status", user?.id, variables.targetUserId],
          context.previousStatus
        );
      }
      toast.error(t("common.error"));
    },
    onSuccess: (data) => {
      if (data.status === "pending") {
        toast.success(t("follow.requestSent"));
      } else {
        toast.success(t("follow.nowFollowing"));
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["follow-status"] });
      queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile", variables.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["follow-requests"] });
    },
  });
}

// Unfollow mutation
export function useUnfollowMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ targetUserId }: { targetUserId: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      if (error) throw error;
      return { targetUserId };
    },
    onMutate: async ({ targetUserId }) => {
      await queryClient.cancelQueries({ queryKey: ["follow-status", user?.id, targetUserId] });
      
      const previousStatus = queryClient.getQueryData(["follow-status", user?.id, targetUserId]);
      queryClient.setQueryData(["follow-status", user?.id, targetUserId], "none");

      return { previousStatus };
    },
    onError: (error, variables, context) => {
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(
          ["follow-status", user?.id, variables.targetUserId],
          context.previousStatus
        );
      }
      toast.error(t("common.error"));
    },
    onSuccess: () => {
      toast.success(t("follow.unfollowed"));
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["follow-status"] });
      queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile", variables.targetUserId] });
    },
  });
}

// Cancel pending follow request
export function useCancelFollowRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ targetUserId }: { targetUserId: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase as any)
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .eq("status", "pending");

      if (error) throw error;
      return { targetUserId };
    },
    onMutate: async ({ targetUserId }) => {
      await queryClient.cancelQueries({ queryKey: ["follow-status", user?.id, targetUserId] });
      
      const previousStatus = queryClient.getQueryData(["follow-status", user?.id, targetUserId]);
      queryClient.setQueryData(["follow-status", user?.id, targetUserId], "none");

      return { previousStatus };
    },
    onError: (error, variables, context) => {
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(
          ["follow-status", user?.id, variables.targetUserId],
          context.previousStatus
        );
      }
      toast.error(t("common.error"));
    },
    onSuccess: () => {
      toast.success(t("follow.requestCanceled"));
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["follow-status"] });
      queryClient.invalidateQueries({ queryKey: ["follow-requests"] });
    },
  });
}
