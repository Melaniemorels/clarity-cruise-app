import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateNotification } from "./use-notifications";

export interface FollowRequest {
  id: string;
  requester_id: string;
  target_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
  requester?: {
    user_id: string;
    handle: string;
    name: string | null;
    photo_url: string | null;
  };
}

interface FollowRequestRow {
  id: string;
  requester_id: string;
  target_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useFollowRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["follow-requests", user?.id],
    queryFn: async (): Promise<FollowRequest[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("follow_requests" as any)
        .select("*")
        .eq("target_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching follow requests:", error);
        return [];
      }

      const requests = data as unknown as FollowRequestRow[];

      // Fetch requester profiles
      const requesterIds = requests.map(r => r.requester_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, handle, name, photo_url")
        .in("user_id", requesterIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return requests.map(r => ({
        ...r,
        status: r.status as "pending" | "accepted" | "rejected",
        requester: profileMap.get(r.requester_id) || undefined,
      }));
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

export function usePendingRequestCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["follow-requests", "count", user?.id],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from("follow_requests" as any)
        .select("*", { count: "exact", head: true })
        .eq("target_id", user.id)
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

export function useAcceptRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const createNotification = useCreateNotification();

  return useMutation({
    mutationFn: async (requestId: string) => {
      // Get the request first
      const { data, error: fetchError } = await supabase
        .from("follow_requests" as any)
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;

      const request = data as unknown as FollowRequestRow;

      // Update request status
      const { error: updateError } = await supabase
        .from("follow_requests" as any)
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Create the follow relationship
      const { error: followError } = await supabase
        .from("follows")
        .insert({
          follower_id: request.requester_id,
          following_id: request.target_id,
        });

      if (followError && !followError.message.includes("duplicate")) {
        throw followError;
      }

      // Create notification for the requester
      if (user) {
        await createNotification.mutateAsync({
          user_id: request.requester_id,
          type: "request_accepted",
          actor_id: user.id,
        });
      }

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-requests"] });
      queryClient.invalidateQueries({ queryKey: ["follows"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const createNotification = useCreateNotification();

  return useMutation({
    mutationFn: async (requestId: string) => {
      // Get the request first
      const { data, error: fetchError } = await supabase
        .from("follow_requests" as any)
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;

      const request = data as unknown as FollowRequestRow;

      // Update request status
      const { error } = await supabase
        .from("follow_requests" as any)
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      // Create notification for the requester
      if (user) {
        await createNotification.mutateAsync({
          user_id: request.requester_id,
          type: "request_rejected",
          actor_id: user.id,
        });
      }

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-requests"] });
    },
  });
}

export function useSendFollowRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const createNotification = useCreateNotification();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("follow_requests" as any)
        .insert({
          requester_id: user.id,
          target_id: targetUserId,
          status: "pending",
        });

      if (error) throw error;

      // Create notification for target user
      await createNotification.mutateAsync({
        user_id: targetUserId,
        type: "follow_request",
        actor_id: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-requests"] });
    },
  });
}
