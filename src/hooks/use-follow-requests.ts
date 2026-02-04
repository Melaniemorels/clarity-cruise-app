import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FollowRequest {
  id: string;
  follower_id: string;
  following_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
  requester?: {
    user_id: string;
    handle: string;
    name: string | null;
    photo_url: string | null;
  };
}

interface FollowRow {
  id: string;
  follower_id: string;
  following_id: string;
  status: string;
  created_at: string;
}

// Get pending follow requests (people wanting to follow current user)
export function useFollowRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["follow-requests", user?.id],
    queryFn: async (): Promise<FollowRequest[]> => {
      if (!user) return [];

      // Get pending follows where current user is the target
      const { data, error } = await (supabase as any)
        .from("follows")
        .select("id, follower_id, following_id, status, created_at")
        .eq("following_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching follow requests:", error);
        return [];
      }

      const requests = data as FollowRow[];

      if (requests.length === 0) return [];

      // Fetch requester profiles
      const requesterIds = requests.map(r => r.follower_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, handle, name, photo_url")
        .in("user_id", requesterIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return requests.map(r => ({
        id: r.id,
        follower_id: r.follower_id,
        following_id: r.following_id,
        status: r.status as "pending" | "accepted" | "blocked",
        created_at: r.created_at,
        requester: profileMap.get(r.follower_id) || undefined,
      }));
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

// Get count of pending requests
export function usePendingRequestCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["follow-requests", "count", user?.id],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      const { count, error } = await (supabase as any)
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id)
        .eq("status", "pending");

      if (error) {
        console.error("Error fetching request count:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

// Accept a follow request (change status from pending to accepted)
export function useAcceptRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Get the request first to know who the follower is
      const { data: followData, error: fetchError } = await (supabase as any)
        .from("follows")
        .select("id, follower_id, following_id, status")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;

      const follow = followData as FollowRow;

      // Verify the current user is the target
      if (follow.following_id !== user.id) {
        throw new Error("Not authorized");
      }

      // Update to accepted
      const { error: updateError } = await (supabase as any)
        .from("follows")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Create notification for the requester
      await (supabase as any).from("notifications").insert({
        user_id: follow.follower_id,
        actor_id: user.id,
        type: "request_accepted",
        message: "accepted your follow request",
      });

      return follow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-requests"] });
      queryClient.invalidateQueries({ queryKey: ["follow-status"] });
      queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}

// Reject a follow request (delete the pending follow)
export function useRejectRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Get the request first
      const { data: followData, error: fetchError } = await (supabase as any)
        .from("follows")
        .select("id, follower_id, following_id, status")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;

      const follow = followData as FollowRow;

      // Verify the current user is the target
      if (follow.following_id !== user.id) {
        throw new Error("Not authorized");
      }

      // Delete the pending follow
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      // Optionally create notification for the requester
      await (supabase as any).from("notifications").insert({
        user_id: follow.follower_id,
        actor_id: user.id,
        type: "request_rejected",
        message: "declined your follow request",
      });

      return follow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-requests"] });
      queryClient.invalidateQueries({ queryKey: ["follow-status"] });
    },
  });
}
