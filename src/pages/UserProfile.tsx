import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/hooks/use-profile";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, UserPlus, UserCheck, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  is_following: boolean;
}

const UserProfile = () => {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const followMutation = useFollow();

  // Redirect to own profile if viewing self
  const isOwnProfile = currentUser?.id === userId;

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

      // Fetch posts count
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Fetch followers count
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId);

      // Fetch following count
      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId);

      // Check if current user is following
      let isFollowing = false;
      if (currentUser) {
        const { count } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", currentUser.id)
          .eq("following_id", userId);
        isFollowing = (count || 0) > 0;
      }

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
        is_following: isFollowing,
      };
    },
    enabled: !!userId && !isOwnProfile,
  });

  // Redirect to own profile page
  if (isOwnProfile) {
    navigate("/profile", { replace: true });
    return null;
  }

  const handleFollow = () => {
    if (!userId || !profile) return;
    followMutation.mutate({ 
      targetUserId: userId, 
      isFollowing: profile.is_following 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
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
        <BottomNav />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background pb-20">
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
        <BottomNav />
      </div>
    );
  }

  return (
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
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl overflow-hidden">
                {profile.photo_url ? (
                  <img 
                    src={profile.photo_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  "🌿"
                )}
              </div>
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
                  <span><strong>{profile.followers_count}</strong> {t("profile.followers")}</span>
                  <span><strong>{profile.following_count}</strong> {t("profile.following")}</span>
                </div>
              </div>
            </div>
            
            {currentUser && (
              <Button 
                className="w-full" 
                variant={profile.is_following ? "outline" : "default"}
                onClick={handleFollow}
                disabled={followMutation.isPending}
              >
                {profile.is_following ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    {t("userSearch.following")}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t("userSearch.follow")}
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Private account notice */}
        {profile.is_private && !profile.is_following && (
          <Card>
            <CardContent className="p-6 text-center">
              <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">{t("profile.privateAccount")}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default UserProfile;
