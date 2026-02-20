import { useEffect, useRef, useState as useReactState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveNav, useNavPadding } from "@/components/ResponsiveNav";
import { AdaptiveHeading, AdaptiveText } from "@/components/AdaptiveLayout";
import { useDevice, useResponsiveFontSize } from "@/hooks/use-device";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, ExternalLink, Sparkles } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentPlayer } from "@/components/ContentPlayer";
import { AIRecommendationsSection } from "@/components/explore/AIRecommendationsSection";
import { ElevateSection } from "@/components/explore/ElevateSection";
import { MediaConnectionBanner } from "@/components/explore/MediaConnectionBanner";
import { ExploreOnboardingDialog } from "@/components/explore/ExploreOnboardingDialog";
import { ContextHelpTooltip } from "@/components/ContextHelpTooltip";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { openExternal, detectProvider, COMING_SOON_PROVIDERS, PROVIDER_LABEL_KEYS } from "@/lib/external-link";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useModuleTimeTracker } from "@/hooks/use-module-time-tracker";
import { FirstTapTooltip } from "@/components/FirstTapTooltip";
import { useGuide } from "@/contexts/GuideContext";
import { useForYouFeed, useLogItemEvent, type ExploreItem } from "@/hooks/use-explore-feed";

const Explore = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedContent, setSelectedContent] = useState<{
    title: string;
    category: string;
    icon: string;
    duration: string;
    color: string;
  } | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const device = useDevice();
  const navPadding = useNavPadding();
  const fonts = useResponsiveFontSize();
  const [exploreCardTapped, setExploreCardTapped] = useReactState(false);
  const exploreCardRef = useRef<HTMLDivElement>(null);
  const exploreHeaderRef = useRef<HTMLDivElement>(null);
  const { isFirstTap, markFirstTap } = useGuide();

  // Track time spent on Explore module
  const exploreTracker = useModuleTimeTracker("EXPLORE");
  const logEvent = useLogItemEvent();

  // Fetch personalized feed from backend
  const { data: feedData, isLoading: feedLoading } = useForYouFeed();

  // Group items by category for display
  const categoryGroups = useMemo(() => {
    const items = feedData?.items ?? [];
    const groups = new Map<string, ExploreItem[]>();
    for (const item of items) {
      const cat = item.category;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(item);
    }
    return Array.from(groups.entries()).map(([cat, items]) => ({
      category: cat,
      items,
    }));
  }, [feedData]);

  useEffect(() => {
    exploreTracker.start();
    return () => exploreTracker.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContentClick = async (item: { url?: string }, cardEl?: HTMLDivElement | null) => {
    // Track first card tap for tooltip
    if (isFirstTap("exploreCard") && !exploreCardTapped) {
      setExploreCardTapped(true);
      if (cardEl) {
        (exploreCardRef as React.MutableRefObject<HTMLDivElement | null>).current = cardEl;
      }
    }

    if (!item.url) {
      const { toast } = await import("sonner");
      toast(t('explore.unavailable.title'), {
        description: t('explore.unavailable.comingSoon'),
        duration: 4000,
      });
      return;
    }
    try {
      await openExternal(item.url);
    } catch {
      const { toast } = await import("sonner");
      toast(t('explore.unavailable.title'), {
        description: t('explore.unavailable.error'),
        duration: 4000,
      });
    }
  };

  const CATEGORY_META: Record<string, { icon: string; gradient: string }> = {
    Elevate: { icon: "⬡", gradient: "from-violet-500/20 to-indigo-500/20" },
    Enfoque: { icon: "🧠", gradient: "from-blue-500/20 to-indigo-500/20" },
    Energía: { icon: "⚡", gradient: "from-yellow-500/20 to-orange-500/20" },
    Calma: { icon: "🌿", gradient: "from-green-500/20 to-teal-500/20" },
    Recuperación: { icon: "💚", gradient: "from-emerald-500/20 to-green-500/20" },
    Sueño: { icon: "🌙", gradient: "from-purple-500/20 to-violet-500/20" },
    Nutrición: { icon: "🥗", gradient: "from-lime-500/20 to-green-500/20" },
    Música: { icon: "🎵", gradient: "from-purple-500/20 to-pink-500/20" },
    PlanesDeComida: { icon: "📋", gradient: "from-teal-500/20 to-cyan-500/20" },
  };


  return (
    <div className={cn("min-h-screen bg-theme-bg transition-all duration-300", navPadding)}>
      <div className={cn(
        "space-y-6 transition-all",
        device.isMobile ? "p-4" : device.isTablet ? "p-6" : "p-8 max-w-7xl mx-auto"
      )}>
        {/* Header */}
        <div ref={exploreHeaderRef} className="flex items-center justify-between">
          <div>
            <AdaptiveHeading level={1}>{t('explore.title')}</AdaptiveHeading>
            <AdaptiveText variant="small">{t('explore.subtitle')}</AdaptiveText>
          </div>
        </div>

        {/* AI Recommendations Section */}
        <AIRecommendationsSection />

        {/* Media Connection Prompt */}
        <MediaConnectionBanner />

        {/* Elevate Section */}
        <ElevateSection />

        {/* First-time onboarding dialog */}
        <ExploreOnboardingDialog />

        {/* Personalized Categories from Backend */}
        {feedLoading ? (
          // Skeleton loading for categories
          [...Array(3)].map((_, idx) => (
            <div key={idx} className={cn("space-y-3", device.isTablet && "space-y-4")}>
              <Skeleton className="h-6 w-40" />
              <div className={cn("flex pb-4", device.isMobile ? "gap-3" : "gap-4")}>
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className={cn("flex-shrink-0 overflow-hidden bg-theme-cardBg", device.isMobile ? "w-40" : device.isTablet ? "w-48" : "w-56")} style={{ borderRadius: "18px" }}>
                    <Skeleton className={cn("w-full", device.isMobile ? "h-28" : device.isTablet ? "h-32" : "h-36")} />
                    <CardContent className={device.isMobile ? "p-3" : "p-4"}>
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        ) : (
          categoryGroups.map(({ category: cat, items }) => {
            const meta = CATEGORY_META[cat] ?? { icon: "📌", gradient: "from-primary/20 to-primary/10" };
            return (
              <div key={cat} className={cn("space-y-3", device.isTablet && "space-y-4")}>
                <div className="flex items-center justify-between">
                  <h2 className={cn("font-semibold flex items-center gap-2 text-theme-textPrimary", fonts.heading3)}>
                    <span className={device.isMobile ? "text-xl" : "text-2xl"}>{meta.icon}</span>
                    {cat}
                  </h2>
                  <Button variant="ghost" size="sm">{t('common.viewAll')}</Button>
                </div>

                <ScrollArea className="w-full whitespace-nowrap">
                  <div className={cn("flex pb-4", device.isMobile ? "gap-3" : "gap-4")}>
                    {items.map((item) => {
                      const provider = detectProvider(item.url);
                      const showComingSoon = COMING_SOON_PROVIDERS.includes(provider);
                      return (
                        <Card
                          key={item.id}
                          className={cn(
                            "flex-shrink-0 overflow-hidden cursor-pointer transition-all hover:scale-[1.02] bg-theme-cardBg",
                            device.isMobile ? "w-40" : device.isTablet ? "w-48" : "w-56"
                          )}
                          style={{ borderRadius: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                          onClick={(e) => {
                            logEvent.mutate({ itemId: item.id, event: "open" });
                            handleContentClick(item, e.currentTarget);
                          }}
                        >
                          <div className={cn(
                            "bg-gradient-to-br flex items-center justify-center",
                            meta.gradient,
                            device.isMobile ? "h-28" : device.isTablet ? "h-32" : "h-36"
                          )}>
                            <div className={device.isMobile ? "text-3xl" : "text-4xl"}>{meta.icon}</div>
                          </div>
                          <CardContent className={device.isMobile ? "p-3" : "p-4"}>
                            <h3 className={cn("font-medium mb-0.5 truncate text-theme-textPrimary", fonts.small)}>
                              {item.title}
                            </h3>
                            <div className="flex items-center gap-1 mb-1.5">
                              <Badge variant="outline" className="text-[9px] capitalize px-1.5 py-0 font-normal">
                                {t(PROVIDER_LABEL_KEYS[provider])}
                              </Badge>
                              {item.duration_min && (
                                <span className={cn("text-theme-textSecondary", device.isMobile ? "text-[10px]" : "text-xs")}>
                                  {item.duration_min} min
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 gap-1 text-[10px] text-theme-textSecondary hover:text-theme-textPrimary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  logEvent.mutate({ itemId: item.id, event: "open" });
                                  handleContentClick(item);
                                }}
                              >
                                <ExternalLink className="h-3 w-3" />
                                {t('explore.open')}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  logEvent.mutate({ itemId: item.id, event: "save" });
                                }}
                              >
                                <Bookmark className="h-3 w-3" />
                              </Button>
                            </div>
                            {showComingSoon && (
                              <p className="text-[9px] text-theme-textSecondary/60 mt-1.5 leading-tight">
                                {t('explore.integrationComingSoon')}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            );
          })
        )}

        {/* Perfect Day CTA */}
        <Card 
          className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20 cursor-pointer hover:scale-[1.01] transition-transform"
          onClick={() => navigate("/perfect-day")}
        >
          <CardContent className="p-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="font-semibold mb-2">{t('explore.createTemplateTitle')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('explore.createTemplateDescription')}
            </p>
            <Button>
              {t('explore.createTemplate')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <ContentPlayer
        open={playerOpen}
        onOpenChange={setPlayerOpen}
        content={selectedContent}
      />

      <FirstTapTooltip
        tapId="exploreCard"
        pageKey="explore"
        title={t("guide.tips.exploreCardTitle")}
        body={t("guide.tips.exploreCardBody")}
        anchorRef={exploreCardRef}
        show={exploreCardTapped}
      />

      <ContextHelpTooltip
        helpKey="explore:header"
        title={t("contextHelp.exploreTitle")}
        body={t("contextHelp.exploreBody")}
        anchorRef={exploreHeaderRef}
        placement="bottom"
      />

      <ResponsiveNav />
    </div>
  );
};

export default Explore;
