import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { UserProfileCaptureViewer } from "@/components/UserProfileCaptureViewer";
import type { Post } from "@/hooks/use-posts";
import { cn } from "@/lib/utils";

/** Thumbnail with broken-image fallback */
function PostThumbnail({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-primary/10 to-secondary/10">
        📸
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

interface UserProfilePostsGridProps {
  posts: Post[];
  isLoading: boolean;
  canView: boolean;
  isFollower: boolean;
}

export function UserProfilePostsGrid({
  posts,
  isLoading,
  canView,
  isFollower,
}: UserProfilePostsGridProps) {
  const { t } = useTranslation();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  if (!canView) {
    if (isFollower) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t("profile.sectionPrivate", { section: t("privacy.sectionVisibility.posts") })}
            </p>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">{t("profile.captures")}</h3>
          {isLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {posts.slice(0, 9).map((post, index) => (
                <button
                  key={post.id}
                  onClick={() => openViewer(index)}
                  className={cn(
                    "aspect-square rounded-xl bg-muted relative overflow-hidden group",
                    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    "active:scale-[0.93] active:brightness-90 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    "will-change-transform"
                  )}
                >
                  {post.image_url ? (
                    <PostThumbnail src={post.image_url} alt={t("calendar.capture")} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-primary/10 to-secondary/10">
                      📸
                    </div>
                  )}
                  {/* Resting subtle vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/25 via-transparent to-transparent opacity-100 transition-opacity duration-300" />
                  {/* Hover overlay with date */}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-background text-[11px] font-light tracking-wide">
                        {format(parseISO(post.created_at), "d MMM, HH:mm")}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("profile.noCapturesYet")}
            </p>
          )}
        </CardContent>
      </Card>

      <UserProfileCaptureViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        posts={posts.slice(0, 9)}
        initialIndex={viewerIndex}
      />
    </>
  );
}
