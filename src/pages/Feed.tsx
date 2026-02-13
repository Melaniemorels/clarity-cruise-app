import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ResponsiveNav, useNavPadding } from "@/components/ResponsiveNav";
import { AdaptiveHeading } from "@/components/AdaptiveLayout";
import { useDevice } from "@/hooks/use-device";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PostItem } from "@/components/PostItem";
import { QuickCamera } from "@/components/QuickCamera";
import { SocialBudgetModal } from "@/components/SocialBudgetModal";
import { SocialBudgetLockOverlay } from "@/components/SocialBudgetLockOverlay";
import { FeedMotivationalCard } from "@/components/FeedMotivationalCard";
import { TravelDetectionBanner } from "@/components/TravelDetectionBanner";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Plus, Search, Camera, Loader2, Hexagon } from "lucide-react";
import { toast } from "sonner";
import { UserSearchDialog } from "@/components/UserSearchDialog";
import { useInfinitePosts } from "@/hooks/use-posts";
import { useSocialBudgetTracker } from "@/hooks/use-social-budget";
import { cn } from "@/lib/utils";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";
import vyvIcon from "@/assets/vyv-icon.jpeg";

const AUTO_REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes
const COOLDOWN_STORAGE_KEY = "vyv_social_completed_cooldown";

const Feed = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showMotivationalCard, setShowMotivationalCard] = useState(false);
  const [hasReachedLimitThisSession, setHasReachedLimitThisSession] = useState(false);
  const [isInCooldown, setIsInCooldown] = useState(false);
  const device = useDevice();
  const navPadding = useNavPadding();
  const lastRefreshRef = useRef<number>(Date.now());

  // Check and manage cooldown state
  useEffect(() => {
    const checkCooldown = () => {
      const cooldownEnd = localStorage.getItem(COOLDOWN_STORAGE_KEY);
      if (cooldownEnd) {
        const endTime = parseInt(cooldownEnd, 10);
        if (Date.now() < endTime) {
          setIsInCooldown(true);
          // Set timeout to clear cooldown when it expires
          const remainingTime = endTime - Date.now();
          const timeoutId = setTimeout(() => {
            setIsInCooldown(false);
            localStorage.removeItem(COOLDOWN_STORAGE_KEY);
          }, remainingTime);
          return () => clearTimeout(timeoutId);
        } else {
          // Cooldown has expired
          localStorage.removeItem(COOLDOWN_STORAGE_KEY);
          setIsInCooldown(false);
        }
      }
    };
    checkCooldown();
  }, []);

  // Social budget tracking
  const {
    isLimitReached,
    allowExtensions,
    dailyLimitSeconds,
    startTracking,
    stopTracking,
    addExtension,
  } = useSocialBudgetTracker();

  // Start tracking when component mounts, stop when unmounts
  useEffect(() => {
    startTracking();
    return () => {
      stopTracking();
    };
  }, [startTracking, stopTracking]);

  // Show modal when limit is reached (but respect cooldown)
  useEffect(() => {
    if (isLimitReached && !showBudgetModal && !hasReachedLimitThisSession && !isInCooldown) {
      setShowBudgetModal(true);
      setHasReachedLimitThisSession(true);
      setShowMotivationalCard(true);
    }
  }, [isLimitReached, showBudgetModal, hasReachedLimitThisSession, isInCooldown]);

  // Reset motivational card flag when extending time
  useEffect(() => {
    if (!isLimitReached && hasReachedLimitThisSession) {
      // User extended time, reset the session flag so message shows again when new limit is reached
      setHasReachedLimitThisSession(false);
    }
  }, [isLimitReached, hasReachedLimitThisSession]);

  const handleExtendTime = useCallback(() => {
    addExtension(5);
    setShowBudgetModal(false);
    toast.success(t('socialBudget.extended'));
  }, [addExtension, t]);

  const handleReturnToFocus = useCallback(() => {
    setShowBudgetModal(false);
  }, []);

  // Callback when user returns to focus from overlay - cooldown matches user's chosen limit
  const handleOverlayReturnToFocus = useCallback(() => {
    // Use the user's daily limit as cooldown duration (in ms)
    const cooldownDuration = dailyLimitSeconds === Infinity 
      ? 15 * 60 * 1000  // Default 15 min if unlimited
      : dailyLimitSeconds * 1000;
    const cooldownEnd = Date.now() + cooldownDuration;
    localStorage.setItem(COOLDOWN_STORAGE_KEY, cooldownEnd.toString());
    setIsInCooldown(true);
  }, [dailyLimitSeconds]);

  const { 
    data, 
    isLoading, 
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch 
  } = useInfinitePosts({ feedType: "following" });

  // Silent background refresh - no UI feedback
  const silentRefresh = useCallback(async () => {
    const now = Date.now();
    // Throttle: don't refresh more than once per 30 seconds
    if (now - lastRefreshRef.current < 30000) return;
    
    lastRefreshRef.current = now;
    await refetch();
  }, [refetch]);

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

  // Auto-refresh on visibility change (tab focus / app resume)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        silentRefresh();
      }
    };

    const handleFocus = () => {
      silentRefresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [silentRefresh]);

  // Interval-based refresh (every 3 minutes)
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Only refresh if tab is visible
      if (document.visibilityState === 'visible') {
        silentRefresh();
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [silentRefresh]);

  // Realtime subscription for new posts - immediate update
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
          // Silently refetch to get new posts
          silentRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, silentRefresh]);

  return (
    <div className={cn("min-h-screen relative bg-theme-bg transition-all duration-300", navPadding)}>
      {/* Watermark - subtle old money: hexagon + logo behind posts */}
      {!isLimitReached && !isLoading && posts.length > 0 && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
          {/* Hexagon outline */}
          <Hexagon 
            size={device.isDesktop ? 500 : device.isTablet ? 400 : 300} 
            strokeWidth={0.5}
            className="text-theme-borderSubtle opacity-[0.08] absolute"
          />
          {/* Logo centered inside */}
          <img 
            src={vyvIcon} 
            alt="" 
            className="opacity-[0.04] grayscale absolute"
            style={{
              width: device.isDesktop ? '120px' : device.isTablet ? '100px' : '80px',
              height: 'auto',
            }}
          />
        </div>
      )}

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
            <div className={cn("flex items-center", device.isMobile ? "gap-2" : "gap-4")}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="h-5 w-5 text-theme-textSecondary hover:text-theme-textPrimary transition-colors" strokeWidth={1.4} />
              </Button>
              <NotificationCenter />
              <Button
                size="icon"
                onClick={() => setIsCameraOpen(true)}
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

        <TravelDetectionBanner />

        <div className="relative">
          {/* Social time completed state - replaces feed content when limit reached */}
          {isLimitReached && !isInCooldown ? (
            <SocialBudgetLockOverlay 
              visible={true} 
              allowExtensions={allowExtensions}
              onExtend={handleExtendTime}
              onReturnToFocus={handleOverlayReturnToFocus}
            />
          ) : (
            <div className="p-4 space-y-4">
              {/* Motivational card when limit was reached */}
              <FeedMotivationalCard 
                visible={showMotivationalCard && !showBudgetModal && !isLimitReached}
                onDismiss={() => setShowMotivationalCard(false)}
              />

              {/* Feed content */}
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
                    onClick={() => setIsCameraOpen(true)}
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
                  
                  {/* Load more trigger - only when actively loading more */}
                  <div ref={loadMoreRef} className="py-4 flex justify-center">
                    {isFetchingNextPage && (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Social Budget Modal */}
      <SocialBudgetModal
        open={showBudgetModal}
        onExtend={handleExtendTime}
        onReturn={handleReturnToFocus}
        allowExtensions={allowExtensions}
      />

      <QuickCamera
        isOpen={isCameraOpen}
        onOpenChange={setIsCameraOpen}
      />

      <UserSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />

      <ResponsiveNav onCreatePost={() => setIsCameraOpen(true)} />
    </div>
  );
};

export default Feed;
