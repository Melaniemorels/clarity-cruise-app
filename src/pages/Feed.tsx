import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ResponsiveNav, useNavPadding } from "@/components/ResponsiveNav";
import { AdaptiveHeading } from "@/components/AdaptiveLayout";
import { useDevice } from "@/hooks/use-device";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PostItem } from "@/components/PostItem";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { Plus, RefreshCw, Search, Hexagon, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { UserSearchDialog } from "@/components/UserSearchDialog";
import { useInfinitePosts } from "@/hooks/use-posts";
import { cn } from "@/lib/utils";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";

const Feed = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const device = useDevice();
  const navPadding = useNavPadding();

  const { 
    data, 
    isLoading, 
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch 
  } = useInfinitePosts({ feedType: "following" });

  // Infinite scroll trigger
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
  });

  // Load more when scroll reaches bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten paginated data
  const posts = data?.pages.flatMap(page => page.posts) || [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success(t('feed.feedUpdated'));
    } catch (error) {
      toast.error(t('feed.errorUpdating'));
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, t]);

  // Realtime subscription for new posts
  useEffect(() => {
    const channel = supabase
      .channel("posts-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
        },
        () => {
          // Only invalidate, don't auto-refetch to avoid jarring UX
          queryClient.invalidateQueries({ queryKey: ["posts", "infinite"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className={cn("min-h-screen relative bg-theme-bg transition-all duration-300", navPadding)}>
      {/* Watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        <Hexagon 
          size={device.isDesktop ? 500 : device.isTablet ? 400 : 300} 
          strokeWidth={0.5}
          className="text-theme-borderSubtle opacity-12"
        />
      </div>

      <div className={cn(
        "mx-auto relative z-10 transition-all duration-300",
        device.isDesktop ? "max-w-3xl" : device.isTablet ? "max-w-2xl" : "max-w-full"
      )}>
        <div className="sticky top-0 z-10 backdrop-blur bg-theme-bgElevated/80 border-b border-theme-borderSubtle">
          <div className={cn(
            "flex items-center justify-between transition-all",
            device.isMobile ? "p-4" : "p-5"
          )}>
            <AdaptiveHeading level={1}>VYV</AdaptiveHeading>
            <div className={cn("flex items-center", device.isMobile ? "gap-3" : "gap-5")}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="h-5 w-5" strokeWidth={1.4} style={{ color: '#EAEAEA' }} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} strokeWidth={1.4} style={{ color: '#EAEAEA' }} />
              </Button>
              <Button
                size="icon"
                onClick={() => setIsCreateOpen(true)}
                className="rounded-full"
                style={{
                  backgroundColor: '#2F7058',
                  color: '#FFFFFF',
                  borderRadius: '18px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                  padding: '0 16px',
                  height: '36px',
                  width: 'auto'
                }}
              >
                <Plus className="h-4 w-4" strokeWidth={1.4} />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {isLoading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-3 p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-64 w-full rounded-lg" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-4">
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ))}
            </>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 animate-in fade-in" style={{ animationDuration: '280ms' }}>
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <Camera size={56} strokeWidth={1.2} className="text-muted-foreground/40" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Plus size={12} className="text-primary-foreground" strokeWidth={2.5} />
                  </div>
                </div>
              </div>
              <p className="mb-2 text-xl font-medium text-foreground">
                {t('feed.emptyTitle')}
              </p>
              <p className="mb-6 text-sm text-muted-foreground max-w-xs mx-auto">
                {t('feed.emptyDescription')}
              </p>
              <Button 
                onClick={() => setIsCreateOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-lg px-6 py-2.5"
              >
                <Plus className="h-4 w-4 mr-2" strokeWidth={1.5} />
                {t('feed.captureFirstVibe')}
              </Button>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostItem
                  key={post.id}
                  post={post}
                />
              ))}
              
              {/* Load more trigger */}
              <div ref={loadMoreRef} className="py-4 flex justify-center">
                {isFetchingNextPage && (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                )}
                {!hasNextPage && posts.length > 0 && (
                  <p className="text-sm text-muted-foreground">{t('feed.noMorePosts')}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <CreatePostDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      <UserSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />

      <ResponsiveNav onCreatePost={() => setIsCreateOpen(true)} />
    </div>
  );
};

export default Feed;
