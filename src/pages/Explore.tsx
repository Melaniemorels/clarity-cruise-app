import { useEffect, useRef, useState as useReactState } from "react";
import { ResponsiveNav, useNavStyle } from "@/components/ResponsiveNav";
import { useDevice } from "@/hooks/use-device";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { ContentPlayer } from "@/components/ContentPlayer";
import { AIRecommendationsSection } from "@/components/explore/AIRecommendationsSection";
import { ElevateSection } from "@/components/explore/ElevateSection";
import { MediaConnectionBanner } from "@/components/explore/MediaConnectionBanner";
import { ExploreOnboardingDialog } from "@/components/explore/ExploreOnboardingDialog";
import { ContextHelpTooltip } from "@/components/ContextHelpTooltip";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useModuleTimeTracker } from "@/hooks/use-module-time-tracker";
import { FirstTapTooltip } from "@/components/FirstTapTooltip";
import { useGuide } from "@/contexts/GuideContext";
import { ExploreSectionCarousel, EXPLORE_SECTIONS } from "@/components/explore/ExploreSectionCarousel";
import { ExplorerContextualRecs } from "@/components/explore/ContextualRecsCard";
import { useDwellTracker } from "@/hooks/use-dwell-tracker";

const Explore = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedContent, setSelectedContent] = useState<{
    title: string; category: string; icon: string; duration: string; color: string;
  } | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const device = useDevice();
  const navStyle = useNavStyle();
  const [exploreCardTapped, setExploreCardTapped] = useReactState(false);
  const exploreCardRef = useRef<HTMLDivElement>(null);
  const exploreHeaderRef = useRef<HTMLDivElement>(null);
  const { isFirstTap } = useGuide();

  const exploreTracker = useModuleTimeTracker("EXPLORE");
  const dwellTracker = useDwellTracker("explore");

  useEffect(() => {
    exploreTracker.start();
    return () => {
      exploreTracker.stop();
      dwellTracker.flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn("min-h-screen bg-background transition-all duration-300", navPadding)}>
      <div className={cn(
        "space-y-8 transition-all",
        device.isMobile ? "p-4" : device.isTablet ? "p-6" : "p-8 max-w-7xl mx-auto"
      )}>
        {/* Header — old money: understated, weighted */}
        <div ref={exploreHeaderRef}>
          <h1 className={cn(
            "font-bold tracking-tight text-foreground",
            device.isMobile ? "text-2xl" : "text-3xl"
          )}>
            {t('explore.title')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('explore.subtitle')}
          </p>
        </div>

        {/* AI Recommendations */}
        <AIRecommendationsSection />

        {/* Contextual AI — based on scroll + calendar */}
        <ExplorerContextualRecs />

        {/* Media Connection */}
        <MediaConnectionBanner />

        {/* Elevate */}
        <ElevateSection />

        {/* Onboarding */}
        <ExploreOnboardingDialog />

        {/* Curated sections — AI-ranked per user */}
        <div className="space-y-8">
          {EXPLORE_SECTIONS.map((section) => (
            <ExploreSectionCarousel
              key={section.key}
              section={section}
              onSectionVisible={dwellTracker.onCategoryVisible}
              onSectionHidden={dwellTracker.onCategoryHidden}
            />
          ))}
        </div>

        {/* Perfect Day CTA — refined, old money */}
        <div
          className="rounded-2xl border border-border/50 bg-card p-6 text-center cursor-pointer hover:border-border transition-all duration-300"
          onClick={() => navigate("/perfect-day")}
        >
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h3 className="font-semibold text-foreground mb-1.5 tracking-tight">
            {t('explore.createTemplateTitle')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            {t('explore.createTemplateDescription')}
          </p>
          <Button size="sm" className="tracking-wide">
            {t('explore.createTemplate')}
          </Button>
        </div>
      </div>

      <ContentPlayer open={playerOpen} onOpenChange={setPlayerOpen} content={selectedContent} />

      <FirstTapTooltip
        tapId="exploreCard" pageKey="explore"
        title={t("guide.tips.exploreCardTitle")} body={t("guide.tips.exploreCardBody")}
        anchorRef={exploreCardRef} show={exploreCardTapped}
      />

      <ContextHelpTooltip
        helpKey="explore:header" title={t("contextHelp.exploreTitle")}
        body={t("contextHelp.exploreBody")} anchorRef={exploreHeaderRef} placement="bottom"
      />

      <ResponsiveNav />
    </div>
  );
};

export default Explore;
