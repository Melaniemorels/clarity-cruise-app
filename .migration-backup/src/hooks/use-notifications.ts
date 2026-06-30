import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationType = 
  | "new_follower" 
  | "follow_request" 
  | "request_accepted" 
  | "request_rejected" 
  | "like" 
  | "comment"
  | "plan_invite"
  | "plan_accepted"
  | "plan_declined";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string;
  reference_id: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    handle: string;
    name: string | null;
    photo_url: string | null;
  };
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  actor_id: string;
  reference_id: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }

      const notifications = data as unknown as NotificationRow[];
      
      // Fetch actor profiles
      const actorIds = [...new Set(notifications.map(n => n.actor_id))];
      
      if (actorIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, handle, name, photo_url")
        .in("user_id", actorIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return notifications.map(n => ({
        ...n,
        type: n.type as NotificationType,
        actor: profileMap.get(n.actor_id) || undefined,
      }));
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", "unread-count", user?.id],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from("notifications" as any)
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Error fetching unread count:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications" as any)
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { error } = await supabase
        .from("notifications" as any)
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: {
      user_id: string;
      type: NotificationType;
      actor_id: string;
      reference_id?: string;
      message?: string;
    }) => {
      const { error } = await supabase
        .from("notifications" as any)
        .insert(notification);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
