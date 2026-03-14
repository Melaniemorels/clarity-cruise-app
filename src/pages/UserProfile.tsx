import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ResponsiveNav, useNavStyle } from "@/components/ResponsiveNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { FollowButton } from "@/components/FollowButton";
import { PrivateProfilePlaceholder } from "@/components/PrivateProfilePlaceholder";
import { FollowListModal } from "@/components/FollowListModal";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useViewerAccess } from "@/hooks/use-viewer-access";
import { useFollowStatus } from "@/hooks/use-follow-status";
import { usePosts } from "@/hooks/use-posts";
import { ScreenshotGuard } from "@/components/ScreenshotGuard";

interface UserProfileData {
  user_id: string;
  handle: string;
  name: string | null;
  bio: string | null;
  photo_url: string | null;
  is_private: boolean;
  posts_count: number;
  followers_count: number;
  following_count: number;
}

const UserProfile = () => {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [followListType, setFollowListType] = useState<"followers" | "following" | null>(null);
  
  // Redirect to own profile if viewing self
  const isOwnProfile = currentUser?.id === userId;
  
  // Access control
  const { access, isLoading: accessLoading, isPrivateLocked } = useViewerAccess(userId);
  const { data: followStatus } = useFollowStatus(userId);

  // Fetch user's posts (only when we have access)
  const { data: userPosts = [], isLoading: postsLoading } = usePosts({
    userId: userId,
    feedType: "user",
  });
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async (): Promise<UserProfileData | null> => {
      if (!userId) return null;

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, handle, name, bio, photo_url, is_private")
        .eq("user_id", userId)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return null;
      }

      // Fetch posts count (always public info for non-private or for display)
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Fetch followers count - only accepted follows
      const { count: followersCount } = await (supabase as any)
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId)
        .eq("status", "accepted");

      // Fetch following count - only accepted follows
      const { count: followingCount } = await (supabase as any)
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId)
        .eq("status", "accepted");

      return {
        user_id: profileData.user_id,
        handle: profileData.handle,
        name: profileData.name,
        bio: profileData.bio,
        photo_url: profileData.photo_url,
        is_private: profileData.is_private ?? false,
        posts_count: postsCount || 0,
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
      };
    },
    enabled: !!userId && !isOwnProfile,
  });

  // Redirect to own profile page
  if (isOwnProfile) {
    navigate("/profile", { replace: true });
    return null;
  }

  const navStyle = useNavStyle();

  if (isLoading || accessLoading) {
    return (
      <div className="min-h-screen bg-background" style={navStyle}>
        <div className="mx-auto max-w-2xl p-4 space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <ResponsiveNav />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background" style={navStyle}>
        <div className="mx-auto max-w-2xl p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">{t("profile.userNotFound")}</p>
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="mt-4"
            >
              {t("common.goBack")}
            </Button>
          </div>
        </div>
        <ResponsiveNav />
      </div>
    );
  }

  return (
    <ScreenshotGuard enabled={!isOwnProfile}>
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-2xl p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">@{profile.handle}</h1>
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <ProfileAvatar
                photoUrl={profile.photo_url}
                handle={profile.handle}
                name={profile.name}
                size="xl"
                className="ring-2 ring-border"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">@{profile.handle}</h2>
                  {profile.is_private && (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                {profile.name && (
                  <p className="text-sm text-muted-foreground">{profile.name}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {profile.bio || t("profile.noBio")}
                </p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span><strong>{profile.posts_count}</strong> {t("profile.posts")}</span>
                  <button 
                    onClick={() => setFollowListType("followers")}
                    className="hover:underline"
                  >
                    <strong>{profile.followers_count}</strong> {t("profile.followers")}
                  </button>
                  <button 
                    onClick={() => setFollowListType("following")}
                    className="hover:underline"
                  >
                    <strong>{profile.following_count}</strong> {t("profile.following")}
                  </button>
                </div>
              </div>
            </div>
            
            {currentUser && userId && (
              <FollowButton
                targetUserId={userId}
                targetIsPrivate={profile.is_private}
                className="w-full"
              />
            )}
          </CardContent>
        </Card>

        {/* Content based on access level */}
        {isPrivateLocked ? (
          <PrivateProfilePlaceholder
            targetUserId={userId!}
            targetIsPrivate={profile.is_private}
          />
        ) : (
          <>
            {/* Posts section - show if viewer has access */}
            {access.canViewPosts ? (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">{t("profile.captures")}</h3>
                  {postsLoading ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="aspect-square rounded-lg" />
                      ))}
                    </div>
                  ) : userPosts.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {userPosts.slice(0, 9).map((post) => (
                        <div
                          key={post.id}
                          className="aspect-square rounded-lg bg-muted relative overflow-hidden group cursor-pointer"
                        >
                          {post.image_url ? (
                            <img
                              src={post.image_url}
                              alt="Capture"
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-primary/10 to-secondary/10">
                              📸
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-background text-xs">
                              {format(parseISO(post.created_at), "d MMM, HH:mm")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t("profile.noCapturesYet")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : followStatus === "accepted" && !access.canViewPosts ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {t("profile.sectionPrivate", { section: t("privacy.sectionVisibility.posts") })}
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>

      {userId && (
        <FollowListModal
          open={followListType !== null}
          onOpenChange={(open) => !open && setFollowListType(null)}
          userId={userId}
          type={followListType || "followers"}
          isPrivateLocked={isPrivateLocked}
        />
      )}

      <BottomNav />
    </div>
    </ScreenshotGuard>
  );
};

export default UserProfile;
