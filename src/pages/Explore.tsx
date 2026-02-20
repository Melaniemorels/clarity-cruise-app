import { useEffect, useRef, useState as useReactState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveNav, useNavPadding } from "@/components/ResponsiveNav";
import { AdaptiveHeading, AdaptiveText } from "@/components/AdaptiveLayout";
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
  const [exploreCardTapped, setExploreCardTapped] = useReactState(false);
  const exploreCardRef = useRef<HTMLDivElement>(null);
  const exploreHeaderRef = useRef<HTMLDivElement>(null);
  const { isFirstTap } = useGuide();

  const exploreTracker = useModuleTimeTracker("EXPLORE");

  useEffect(() => {
    exploreTracker.start();
    return () => exploreTracker.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        {/* Fixed Sections: Yoga, Pilates, Audiolibros, Meal Preps, etc. */}
        {EXPLORE_SECTIONS.map((section) => (
          <ExploreSectionCarousel key={section.key} section={section} />
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
