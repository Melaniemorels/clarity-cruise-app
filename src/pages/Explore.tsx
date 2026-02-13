import { useEffect, useRef, useState as useReactState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveNav, useNavPadding } from "@/components/ResponsiveNav";
import { AdaptiveHeading, AdaptiveText } from "@/components/AdaptiveLayout";
import { useDevice, useResponsiveFontSize } from "@/hooks/use-device";
import { Button } from "@/components/ui/button";
import { Bookmark, Sparkles } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ContentPlayer } from "@/components/ContentPlayer";
import { AIRecommendationsSection } from "@/components/explore/AIRecommendationsSection";
import { ExploreOnboardingDialog } from "@/components/explore/ExploreOnboardingDialog";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { openInAppBrowser } from "@/lib/browser";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useModuleTimeTracker } from "@/hooks/use-module-time-tracker";
import { FirstTapTooltip } from "@/components/FirstTapTooltip";
import { useGuide } from "@/contexts/GuideContext";

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
  const { isFirstTap, markFirstTap } = useGuide();

  // Track time spent on Explore module
  const exploreTracker = useModuleTimeTracker("EXPLORE");
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
      await openInAppBrowser(item.url);
    } catch {
      const { toast } = await import("sonner");
      toast(t('explore.unavailable.title'), {
        description: t('explore.unavailable.error'),
        duration: 4000,
      });
    }
  };

  const categories = [
    {
      title: t('explore.categories.music'),
      icon: "🎵",
      items: [
        { title: "Lo-Fi Beats", duration: "60 min", color: "from-purple-500/20 to-pink-500/20", url: "https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4FyS8kM" },
        { title: t('explore.items.natureSounds'), duration: "45 min", color: "from-green-500/20 to-teal-500/20", url: "https://www.youtube.com/watch?v=L8t9D9N4L08" },
        { title: t('explore.items.meditationMusic'), duration: "30 min", color: "from-blue-500/20 to-indigo-500/20", url: "https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn" },
      ],
    },
    {
      title: t('explore.categories.audiobooks'),
      icon: "🎧",
      items: [
        { title: "The Power of Now", duration: "7h 37m", color: "from-amber-500/20 to-orange-500/20", url: "https://www.audible.com/pd/The-Power-of-Now-Audiobook/B002V0PN36" },
        { title: "Atomic Habits", duration: "5h 35m", color: "from-red-500/20 to-rose-500/20", url: "https://open.spotify.com/show/40ygvasZaqVMMBkgYoUy8C" },
        { title: t('explore.items.mindfulness'), duration: "4h 20m", color: "from-cyan-500/20 to-sky-500/20", url: "https://www.youtube.com/watch?v=QwaDvbC04mI" },
      ],
    },
    {
      title: t('explore.categories.podcasts'),
      icon: "🎙️",
      items: [
        { title: "Huberman Lab", duration: "2h", color: "from-emerald-500/20 to-green-500/20", url: "https://www.hubermanlab.com/podcast" },
        { title: "The Liz Moody Podcast", duration: "45 min", color: "from-violet-500/20 to-purple-500/20", url: "https://podcasts.apple.com/rs/podcast/the-liz-moody-podcast/id1398442165" },
        { title: t('explore.items.healthHabits'), duration: "40 min", color: "from-fuchsia-500/20 to-pink-500/20", url: "https://newsroom.spotify.com/2025-01-10/health-wellness-tips-podcasts/" },
      ],
    },
    {
      title: t('explore.categories.yoga'),
      icon: "🧘",
      items: [
        { title: "Yoga With Adriene", duration: "30 min", color: "from-primary/20 to-primary/10", url: "https://www.youtube.com/channel/UCFKE7WVJfvaHW5q283SxchA" },
        { title: "Yoga With Tim", duration: "45 min", color: "from-primary/20 to-primary/10", url: "https://www.youtube.com/c/yogawithtim" },
        { title: t('explore.items.yogaBeginners'), duration: "20 min", color: "from-primary/20 to-primary/10", url: "https://www.youtube.com/playlist?list=PLui6Eyny-UzzWwB4h9y7jAzLbeuCUczAl" },
      ],
    },
    {
      title: t('explore.categories.pilates'),
      icon: "🤸",
      items: [
        { title: t('explore.items.coreStrength'), duration: "25 min", color: "from-secondary/20 to-secondary/10", url: "https://www.youtube.com/watch?v=OJxXA4EwTf0" },
        { title: t('explore.items.fullBody'), duration: "40 min", color: "from-secondary/20 to-secondary/10", url: "https://www.youtube.com/watch?v=dYcNLMwwlMA" },
        { title: t('explore.items.beginnerFlow'), duration: "15 min", color: "from-secondary/20 to-secondary/10", url: "https://www.youtube.com/watch?v=_w8s0DZQkrY" },
      ],
    },
    {
      title: t('explore.categories.meditation'),
      icon: "🧘‍♀️",
      items: [
        { title: t('explore.items.morningCalm'), duration: "10 min", color: "from-accent/20 to-accent/10", url: "https://www.youtube.com/watch?v=tNDJKITApEI" },
        { title: t('explore.items.sleepMeditation'), duration: "20 min", color: "from-accent/20 to-accent/10", url: "https://www.youtube.com/watch?v=ILwkKLkWJWU" },
        { title: t('explore.items.stressRelief'), duration: "15 min", color: "from-accent/20 to-accent/10", url: "https://www.youtube.com/watch?v=3r0YscOXAlI" },
      ],
    },
    {
      title: t('explore.categories.nutrition'),
      icon: "🥗",
      items: [
        { title: "Jamie Oliver", duration: "15 min", color: "from-lime-500/20 to-green-500/20", url: "https://www.youtube.com/watch?v=2Fi65gBAToo" },
        { title: "HealthNut Nutrition", duration: "30 min", color: "from-orange-500/20 to-amber-500/20", url: "https://www.youtube.com/c/HealthNutNutrition" },
        { title: "Minimalist Baker", duration: "10 min", color: "from-pink-500/20 to-rose-500/20", url: "https://www.youtube.com/c/Minimalistbaker" },
      ],
    },
    {
      title: t('explore.categories.mealPlans'),
      icon: "📋",
      items: [
        { title: t('explore.items.mealPrep'), duration: t('explore.guide'), color: "from-teal-500/20 to-cyan-500/20", url: "https://www.youtube.com/watch?v=LzWb_P4lYgA" },
        { title: t('explore.items.healthyRecipes'), duration: t('explore.guide'), color: "from-red-500/20 to-orange-500/20", url: "https://www.youtube.com/watch?v=9UIWc4vUMQ0" },
        { title: t('explore.items.quickMeals'), duration: t('explore.guide'), color: "from-violet-500/20 to-indigo-500/20", url: "https://www.youtube.com/watch?v=2Fi65gBAToo" },
      ],
    },
  ];

  return (
    <div className={cn("min-h-screen bg-theme-bg transition-all duration-300", navPadding)}>
      <div className={cn(
        "space-y-6 transition-all",
        device.isMobile ? "p-4" : device.isTablet ? "p-6" : "p-8 max-w-7xl mx-auto"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <AdaptiveHeading level={1}>{t('explore.title')}</AdaptiveHeading>
            <AdaptiveText variant="small">{t('explore.subtitle')}</AdaptiveText>
          </div>
        </div>

        {/* AI Recommendations Section */}
        <AIRecommendationsSection />

        {/* First-time onboarding dialog */}
        <ExploreOnboardingDialog />

        {/* Categories */}
        {categories.map((category, idx) => (
          <div key={idx} className={cn("space-y-3", device.isTablet && "space-y-4")}>
            <div className="flex items-center justify-between">
              <h2 className={cn(
                "font-semibold flex items-center gap-2 text-theme-textPrimary",
                fonts.heading3
              )}>
                <span className={device.isMobile ? "text-xl" : "text-2xl"}>{category.icon}</span>
                {category.title}
              </h2>
              <Button variant="ghost" size="sm">{t('common.viewAll')}</Button>
            </div>
            
            <ScrollArea className="w-full whitespace-nowrap">
              <div className={cn("flex pb-4", device.isMobile ? "gap-3" : "gap-4")}>
                {category.items.map((item, i) => (
                  <Card 
                    key={i} 
                    className={cn(
                      "flex-shrink-0 overflow-hidden cursor-pointer transition-all hover:scale-[1.02] bg-theme-cardBg",
                      device.isMobile ? "w-40" : device.isTablet ? "w-48" : "w-56"
                    )}
                    style={{
                      borderRadius: '18px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                    onClick={(e) => handleContentClick(item, e.currentTarget)}
                  >
                    <div className={cn(
                      "bg-gradient-to-br flex items-center justify-center",
                      item.color,
                      device.isMobile ? "h-28" : device.isTablet ? "h-32" : "h-36"
                    )}>
                      <div className={device.isMobile ? "text-3xl" : "text-4xl"}>{category.icon}</div>
                    </div>
                    <CardContent className={device.isMobile ? "p-3" : "p-4"}>
                      <h3 className={cn(
                        "font-medium mb-1 truncate text-theme-textPrimary",
                        fonts.small
                      )}>{item.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className={cn("text-theme-textSecondary", device.isMobile ? "text-[10px]" : "text-xs")}>{item.duration}</span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <Bookmark className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        ))}

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
        title="Explorar con intención"
        body="Guarda lo que te hace bien. Evita lo que solo distrae."
        anchorRef={exploreCardRef}
        show={exploreCardTapped}
      />

      <ResponsiveNav />
    </div>
  );
};

export default Explore;
