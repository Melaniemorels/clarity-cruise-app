import { useEffect, useRef, useState as useReactState } from "react";
import { ResponsiveNav, useNavStyle } from "@/components/ResponsiveNav";
import { useDevice } from "@/hooks/use-device";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { ContentPlayer } from "@/components/ContentPlayer";
import { ExploreConnectionsCard } from "@/components/explore/ExploreConnectionsCard";
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
import { SavedSection, ContinueSection } from "@/components/explore/SavedContinueSections";
import { ExplorerContextualRecs } from "@/components/explore/ContextualRecsCard";
import { useDwellTracker } from "@/hooks/use-dwell-tracker";
import { Switch } from "@/components/ui/switch";
import { Languages, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useIncludeOtherLanguages,
  useSetIncludeOtherLanguages,
} from "@/hooks/use-explore-language-pref";

function LanguageToggleRow() {
  const { t } = useTranslation();
  const { data: includeOther = false, isLoading } = useIncludeOtherLanguages();
  const setIncludeOther = useSetIncludeOtherLanguages();

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/50 px-4 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <Languages className="h-4 w-4 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
        <span className="text-xs text-muted-foreground truncate">
          {t("explore.includeOtherLanguages")}
        </span>
      </div>
      <Switch
        checked={includeOther}
        disabled={isLoading || setIncludeOther.isPending}
        onCheckedChange={(checked) => setIncludeOther.mutate(checked)}
        aria-label={t("explore.includeOtherLanguages")}
      />
    </div>
  );
}

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
  const queryClient = useQueryClient();

  // Full-page refresh: re-rank every feed and the contextual recommendations.
  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["explore-feed"] });
    queryClient.invalidateQueries({ queryKey: ["contextual-recs"] });
  };

  useEffect(() => {
    exploreTracker.start();
    return () => {
      exploreTracker.stop();
      dwellTracker.flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background transition-all duration-300" style={navStyle}>
      <div className={cn(
        "space-y-8 transition-all",
        device.isMobile ? "p-4" : device.isTablet ? "p-6" : "p-8 max-w-7xl mx-auto"
      )}>
        {/* Header — old money: understated, weighted */}
        <div ref={exploreHeaderRef} className="flex items-start justify-between gap-3">
          <div>
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
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={handleRefreshAll}
            aria-label={t("explore.refreshAll")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Language preference toggle */}
        <LanguageToggleRow />

        {/* A. Continue where you left off */}
        <ContinueSection />

        {/* B. Right now — contextual recommendations (calendar + time of day) */}
        <ExplorerContextualRecs />

        {/* C. Saved for later */}
        <SavedSection />

        {/* D. Curated category sections — ranked per user */}
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

        {/* E. Connections + manual personalization */}
        <ExploreConnectionsCard />

        {/* Onboarding */}
        <ExploreOnboardingDialog />

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
