import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FollowListUser {
  user_id: string;
  handle: string;
  name: string | null;
  photo_url: string | null;
  is_private: boolean;
}

// Get followers of a user (people who follow them)
export function useFollowers(userId?: string) {
  const { user: currentUser } = useAuth();

  return useQuery({
    queryKey: ["followers-list", userId],
    queryFn: async (): Promise<FollowListUser[]> => {
      if (!userId) return [];

      // Get all accepted follows where the user is the following_id (being followed)
      const { data: follows, error } = await (supabase as any)
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId)
        .eq("status", "accepted");

      if (error) throw error;
      if (!follows || follows.length === 0) return [];

      // Get profile info for each follower
      const followerIds = follows.map((f: { follower_id: string }) => f.follower_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, handle, name, photo_url, is_private")
        .in("user_id", followerIds);

      if (profilesError) throw profilesError;

      return (profiles || []).map(p => ({
        user_id: p.user_id,
        handle: p.handle,
        name: p.name,
        photo_url: p.photo_url,
        is_private: p.is_private ?? false,
      }));
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
}

// Get users that a user is following
export function useFollowing(userId?: string) {
  const { user: currentUser } = useAuth();

  return useQuery({
    queryKey: ["following-list", userId],
    queryFn: async (): Promise<FollowListUser[]> => {
      if (!userId) return [];

      // Get all accepted follows where the user is the follower_id (following others)
      const { data: follows, error } = await (supabase as any)
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId)
        .eq("status", "accepted");

      if (error) throw error;
      if (!follows || follows.length === 0) return [];

      // Get profile info for each followed user
      const followingIds = follows.map((f: { following_id: string }) => f.following_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, handle, name, photo_url, is_private")
        .in("user_id", followingIds);

      if (profilesError) throw profilesError;

      return (profiles || []).map(p => ({
        user_id: p.user_id,
        handle: p.handle,
        name: p.name,
        photo_url: p.photo_url,
        is_private: p.is_private ?? false,
      }));
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
}
