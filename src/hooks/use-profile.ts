import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type TravelIntensity = "low" | "medium" | "high";
export type TravelModeStatus = "off" | "auto" | "on";
export type TravelDetectedReason = "timezone" | "distance" | "calendar" | "manual";

export interface Profile {
  id: string;
  user_id: string;
  handle: string;
  name: string | null;
  bio: string | null;
  photo_url: string | null;
  is_private: boolean;
  is_traveling: boolean;
  home_timezone: string | null;
  current_timezone: string | null;
  travel_intensity: TravelIntensity;
  travel_mode_status: TravelModeStatus;
  travel_detected_reason: TravelDetectedReason | null;
  allow_auto_timezone_shift: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileStats {
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

// Fetch single profile by user_id
export function useProfile(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ["profile", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", targetUserId)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!targetUserId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Fetch profile stats (posts count, followers, following)
// Only counts accepted follows
export function useProfileStats(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ["profile-stats", targetUserId],
    queryFn: async (): Promise<ProfileStats> => {
      if (!targetUserId) {
        return { postsCount: 0, followersCount: 0, followingCount: 0 };
      }

      // Parallel fetch all counts - only accepted follows count
      const [postsResult, followersResult, followingResult] = await Promise.all([
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", targetUserId),
        (supabase as any)
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", targetUserId)
          .eq("status", "accepted"),
        (supabase as any)
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", targetUserId)
          .eq("status", "accepted"),
      ]);

      return {
        postsCount: postsResult.count || 0,
        followersCount: followersResult.count || 0,
        followingCount: followingResult.count || 0,
      };
    },
    enabled: !!targetUserId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Update profile mutation
export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Pick<Profile, "handle" | "name" | "bio" | "photo_url" | "is_private" | "is_traveling" | "home_timezone" | "current_timezone" | "travel_intensity" | "travel_mode_status" | "travel_detected_reason" | "allow_auto_timezone_shift">>) => {
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Perfil actualizado");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Error al actualizar perfil";
      toast.error(message);
    },
  });
}

// Upload profile photo mutation
export function useUploadProfilePhoto() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Usuario no autenticado");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("images")
        .getPublicUrl(fileName);

      // Update profile with new photo URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ photo_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Foto actualizada");
    },
    onError: () => {
      toast.error("Error al subir foto");
    },
  });
}

// Check if current user follows another user
export function useIsFollowing(targetUserId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-following", user?.id, targetUserId],
    queryFn: async () => {
      if (!user || !targetUserId || user.id === targetUserId) return false;

      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
  });
}

// Follow/unfollow mutation
export function useFollow() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetUserId,
      isFollowing,
    }: {
      targetUserId: string;
      isFollowing: boolean;
    }) => {
      if (!user) throw new Error("Usuario no autenticado");

      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: targetUserId });
        if (error) throw error;
      }

      return { targetUserId, newFollowingState: !isFollowing };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["is-following"] });
      queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
      queryClient.invalidateQueries({ queryKey: ["user-search"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success(variables.isFollowing ? "Dejaste de seguir" : "Siguiendo");
    },
    onError: () => {
      toast.error("Error al actualizar");
    },
  });
}

// Search profiles
export function useSearchProfiles(query: string, enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["search-profiles", query],
    queryFn: async () => {
      if (!query.trim() || !user) return [];

      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("id, user_id, handle, name, photo_url, bio")
        .ilike("handle", `%${query}%`)
        .neq("user_id", user.id)
        .limit(20);

      if (error) throw error;

      // Batch check follow status
      const { data: followsData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followingIds = new Set(
        (followsData || []).map((f) => f.following_id)
      );

      return (profilesData || []).map((profile) => ({
        ...profile,
        is_following: followingIds.has(profile.user_id),
      }));
    },
    enabled: enabled && !!query.trim() && !!user,
    staleTime: 1000 * 30, // 30 seconds for search results
  });
}
