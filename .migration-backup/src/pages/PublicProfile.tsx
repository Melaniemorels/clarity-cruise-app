import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { FollowButton } from "@/components/FollowButton";
import { ChevronLeft, Lock } from "lucide-react";

const PublicProfile = () => {
  const { t } = useTranslation();
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      if (!username) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, handle, name, bio, photo_url, is_private")
        .eq("handle", username)
        .single();
      if (error || !data) return null;

      const { count: followersCount } = await (supabase as any)
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", data.user_id)
        .eq("status", "accepted");

      const { count: followingCount } = await (supabase as any)
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", data.user_id)
        .eq("status", "accepted");

      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", data.user_id);

      return {
        ...data,
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        posts_count: postsCount || 0,
      };
    },
    enabled: !!username,
  });

  if (profile && user && profile.user_id === user.id) {
    navigate("/profile", { replace: true });
    return null;
  }

  if (profile && user && profile.user_id !== user.id) {
    navigate(`/profile/${profile.user_id}`, { replace: true });
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-32 w-64 rounded-2xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-lg text-muted-foreground">{t("publicProfile.notFound")}</p>
        <Button variant="outline" onClick={() => navigate("/")}>{t("publicProfile.goHome")}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 text-center space-y-4">
          <ProfileAvatar
            photoUrl={profile.photo_url}
            handle={profile.handle}
            name={profile.name}
            size="xl"
            className="mx-auto ring-2 ring-border"
          />
          <div>
            <h2 className="text-xl font-bold">@{profile.handle}</h2>
            {profile.name && <p className="text-sm text-muted-foreground">{profile.name}</p>}
          </div>
          {profile.is_private ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("publicProfile.privateProfile")}</p>
              {user && (
                <FollowButton
                  targetUserId={profile.user_id}
                  targetIsPrivate={profile.is_private}
                  className="mt-2"
                />
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {profile.bio && <p className="mb-3">{profile.bio}</p>}
              <div className="flex justify-center gap-4">
                <span><strong>{profile.posts_count}</strong> {t("publicProfile.posts")}</span>
                <span><strong>{profile.followers_count}</strong> {t("publicProfile.followers")}</span>
                <span><strong>{profile.following_count}</strong> {t("publicProfile.following")}</span>
              </div>
            </div>
          )}
          {!user && (
            <Button className="w-full mt-4" onClick={() => navigate("/auth")}>
              {t("publicProfile.joinVYV")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicProfile;
