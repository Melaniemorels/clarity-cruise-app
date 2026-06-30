import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFollowStatus } from "./use-follow-status";
import { useProfileSectionVisibility, SectionVisibility } from "./use-section-visibility";

export type ViewerAccessLevel = "owner" | "follower" | "public" | "private_locked";

interface ViewerAccess {
  level: ViewerAccessLevel;
  canViewPosts: boolean;
  canViewCalendar: boolean;
  canViewWellness: boolean;
}

interface ProfileData {
  is_private: boolean;
}

export function useViewerAccess(targetUserId?: string) {
  const { user } = useAuth();
  const { data: followStatus } = useFollowStatus(targetUserId);
  const { settings: visibilitySettings, loading: visibilityLoading } = useProfileSectionVisibility(targetUserId);

  // Fetch target profile privacy setting
  const { data: targetProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["target-profile-privacy", targetUserId],
    queryFn: async (): Promise<ProfileData | null> => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("is_private")
        .eq("user_id", targetUserId)
        .single();

      if (error) return null;
      return data as ProfileData;
    },
    enabled: !!targetUserId,
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = profileLoading || visibilityLoading;

  // Calculate access level
  const getAccessLevel = (): ViewerAccessLevel => {
    // Owner always has full access
    if (user?.id === targetUserId) return "owner";

    // Not logged in = public access only
    if (!user) return targetProfile?.is_private ? "private_locked" : "public";

    // Check follow status for private profiles
    if (targetProfile?.is_private) {
      if (followStatus === "accepted") return "follower";
      return "private_locked";
    }

    // Public profile - check if following for follower-only content
    if (followStatus === "accepted") return "follower";
    return "public";
  };

  // Check if viewer can see a specific section
  const canViewSection = (
    visibility: SectionVisibility | undefined,
    accessLevel: ViewerAccessLevel
  ): boolean => {
    if (!visibility) return false;
    if (accessLevel === "owner") return true;
    if (accessLevel === "private_locked") return false;
    
    if (visibility === "public") return true;
    if (visibility === "private") {
      return accessLevel === "follower";
    }
    
    return false;
  };

  const accessLevel = getAccessLevel();

  const access: ViewerAccess = {
    level: accessLevel,
    canViewPosts: canViewSection(visibilitySettings?.posts_visibility, accessLevel),
    canViewCalendar: canViewSection(visibilitySettings?.calendar_visibility, accessLevel),
    canViewWellness: canViewSection(visibilitySettings?.wellness_visibility, accessLevel),
  };

  return {
    access,
    isLoading,
    isPrivateLocked: accessLevel === "private_locked",
    isFollower: accessLevel === "follower",
    isOwner: accessLevel === "owner",
  };
}
