import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ResponsiveNav, useNavPadding } from "@/components/ResponsiveNav";
import { useDevice } from "@/hooks/use-device";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bookmark, ArrowUpRight, Sparkles } from "lucide-react";
import { useSeeAllFeed, useLogItemEvent, type ExploreItem } from "@/hooks/use-explore-feed";
import { useRecommendations, type RecommendationGoal, type Recommendation } from "@/hooks/use-recommendations";
import { openContent } from "@/lib/open-content";
import { detectProvider, PROVIDER_LABEL_KEYS, COMING_SOON_PROVIDERS } from "@/lib/external-link";
import { Skeleton } from "@/components/ui/skeleton";
import { EXPLORE_SECTIONS } from "@/components/explore/ExploreSectionCarousel";
import { useState } from "react";

// Elevate static items — same data as ElevateSection
const ELEVATE_ITEMS = [
  { title: "Deep Work", duration: "12 min", url: "https://www.youtube.com/watch?v=ZD7dXfdDPfg" },
  { title: "Week Structure", duration: "8 min", url: "https://www.youtube.com/watch?v=o7w5r5PfBKo" },
  { title: "Digital Distraction", duration: "15 min", url: "https://www.youtube.com/watch?v=Hu4Yvq-g7_Y" },
  { title: "Ideal Morning", duration: "10 min", url: "https://www.youtube.com/watch?v=WtKJrB5rOKs" },
  { title: "Energy Management", duration: "7 min", url: "https://www.youtube.com/watch?v=jDGMuwBuC9o" },
  { title: "Mental Clarity", duration: "5 min", url: "https://www.youtube.com/watch?v=lACf4O_eSt0" },
  { title: "Focus Psychology", duration: "25 min", url: "https://www.hubermanlab.com/episode/how-to-focus-to-change-your-brain" },
  { title: "Travel Productivity", duration: "6 min", url: "https://www.youtube.com/watch?v=2paoNvG5Nmo" },
];

const GOAL_FILTERS: { value: RecommendationGoal; labelKey: string }[] = [
  { value: "auto", labelKey: "recommendations.goals.auto" },
  { value: "focus", labelKey: "recommendations.goals.focus" },
  { value: "energy", labelKey: "recommendations.goals.energy" },
  { value: "calm", labelKey: "recommendations.goals.calm" },
  { value: "recovery", labelKey: "recommendations.goals.recovery" },
  { value: "sleep", labelKey: "recommendations.goals.sleep" },
];

export default function ExploreSection() {
  const { sectionKey } = useParams<{ sectionKey: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const device = useDevice();
  const navPadding = useNavPadding();
  const logEvent = useLogItemEvent();

  const stateFilter = (location.state as any)?.filter as string | undefined;

  // Determine section type
  const isParaTi = sectionKey === "para_ti";
  const isElevate = sectionKey === "elevate";
  const sectionConfig = !isParaTi && !isElevate
    ? EXPLORE_SECTIONS.find((s) => s.key === sectionKey)
    : null;

  // For "Para ti" we use recommendations hook
  const [selectedGoal, setSelectedGoal] = useState<RecommendationGoal>(
    (stateFilter as RecommendationGoal) || "auto"
  );
  const recQuery = useRecommendations(isParaTi ? selectedGoal : "auto");

  // For category sections we use the see-all feed
  const feedQuery = useSeeAllFeed(sectionConfig ? sectionKey : undefined);

  const sectionTitle = isParaTi
    ? t("mediaConnections.aiRecommendations")
    : isElevate
      ? t("elevate.title")
      : sectionConfig?.title ?? sectionKey;

  const handleOpenItem = (item: { url?: string | null; provider?: string; title?: string }) => {
    openContent(item, t);
  };

  return (
    <div className={cn("min-h-screen bg-background transition-all duration-300", navPadding)}>
      <div className={cn(
        "space-y-6 transition-all",
        device.isMobile ? "p-4" : device.isTablet ? "p-6" : "p-8 max-w-7xl mx-auto"
      )}>
        {/* Header with back button */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate("/explore")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className={cn(
            "font-bold tracking-tight text-foreground",
            device.isMobile ? "text-xl" : "text-2xl"
          )}>
            {sectionTitle}
          </h1>
        </div>

        {/* Goal filter pills for "Para ti" */}
        {isParaTi && (
          <div className="flex gap-1.5 flex-wrap">
            {GOAL_FILTERS.map((g) => (
              <Button
                key={g.value}
                variant={selectedGoal === g.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedGoal(g.value)}
                className="rounded-full text-xs h-7 px-2.5"
              >
                {t(g.labelKey)}
              </Button>
            ))}
          </div>
        )}

        {/* Content grid */}
        {isParaTi && <ParaTiGrid recommendations={recQuery.data?.recommendations ?? []} isLoading={recQuery.isLoading} onOpen={handleOpenItem} t={t} />}
        {isElevate && <ElevateGrid items={ELEVATE_ITEMS} onOpen={handleOpenItem} t={t} />}
        {sectionConfig && <SectionGrid feedQuery={feedQuery} logEvent={logEvent} onOpen={handleOpenItem} t={t} />}

        {/* Empty state */}
        {!isParaTi && !isElevate && !sectionConfig && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">{t("explore.empty.noRecommendations")}</p>
            <p className="text-sm text-muted-foreground/60 mt-1">{t("explore.empty.saveContent")}</p>
          </div>
        )}
      </div>
      <ResponsiveNav />
    </div>
  );
}

/* ---------- Sub-grids (reuse same card styles, just in grid) ---------- */

function ParaTiGrid({ recommendations, isLoading, onOpen, t }: { recommendations: Recommendation[]; isLoading: boolean; onOpen: (item: any) => void; t: (k: string) => string }) {
  const device = useDevice();
  if (isLoading) return <GridSkeleton />;
  if (recommendations.length === 0) return <EmptyState t={t} />;

  return (
    <div className={cn("grid gap-4", device.isMobile ? "grid-cols-2" : device.isTablet ? "grid-cols-3" : "grid-cols-4")}>
      {recommendations.map((rec, i) => {
        const url = rec.externalUrl || rec.spotifyUri;
        const provider = url ? detectProvider(url) : "other";
        return (
          <div
            key={i}
            className="rounded-2xl overflow-hidden bg-card border border-border/30 cursor-pointer hover:border-border/60 transition-all"
            onClick={() => onOpen({ url, provider, title: rec.title })}
          >
            <div className="p-4 space-y-2">
              <h3 className="font-semibold text-foreground text-sm line-clamp-2">{rec.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{rec.description}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium bg-foreground/10 text-foreground/70 rounded px-1.5 py-0.5">
                  {t(PROVIDER_LABEL_KEYS[provider])}
                </span>
                <span className="text-[11px] text-muted-foreground">{rec.duration}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => { e.stopPropagation(); onOpen({ url, provider, title: rec.title }); }}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {t("explore.open")}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ElevateGrid({ items, onOpen, t }: { items: typeof ELEVATE_ITEMS; onOpen: (item: any) => void; t: (k: string) => string }) {
  const device = useDevice();
  return (
    <div className={cn("grid gap-4", device.isMobile ? "grid-cols-2" : device.isTablet ? "grid-cols-3" : "grid-cols-4")}>
      {items.map((item, i) => {
        const provider = detectProvider(item.url);
        return (
          <div
            key={i}
            className="rounded-2xl overflow-hidden bg-card border border-border/30 cursor-pointer hover:border-border/60 transition-all"
            onClick={() => onOpen(item)}
          >
            <div className="p-4 space-y-2">
              <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium bg-foreground/10 text-foreground/70 rounded px-1.5 py-0.5">
                  {t(PROVIDER_LABEL_KEYS[provider])}
                </span>
                <span className="text-[11px] text-muted-foreground">{item.duration}</span>
              </div>
              <div className="flex items-center pt-1">
                <button
                  className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => { e.stopPropagation(); onOpen(item); }}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {t("explore.open")}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionGrid({ feedQuery, logEvent, onOpen, t }: { feedQuery: any; logEvent: any; onOpen: (item: any) => void; t: (k: string) => string }) {
  const device = useDevice();
  const allItems: ExploreItem[] = feedQuery.data?.pages?.flatMap((p: any) => p.items) ?? [];

  if (feedQuery.isLoading) return <GridSkeleton />;
  if (allItems.length === 0) return <EmptyState t={t} />;

  return (
    <>
      <div className={cn("grid gap-4", device.isMobile ? "grid-cols-2" : device.isTablet ? "grid-cols-3" : "grid-cols-4")}>
        {allItems.map((item) => {
          const provider = detectProvider(item.url);
          return (
            <div
              key={item.id}
              className="rounded-2xl overflow-hidden bg-card border border-border/30 cursor-pointer hover:border-border/60 transition-all"
              onClick={() => {
                logEvent.mutate({ itemId: item.id, event: "open" });
                onOpen(item);
              }}
            >
              <div className="p-4 space-y-2">
                <h3 className="font-semibold text-foreground text-sm line-clamp-2">{item.title}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium bg-foreground/10 text-foreground/70 rounded px-1.5 py-0.5">
                    {t(PROVIDER_LABEL_KEYS[provider])}
                  </span>
                  {item.duration_min && (
                    <span className="text-[11px] text-muted-foreground">{item.duration_min} min</span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      logEvent.mutate({ itemId: item.id, event: "open" });
                      onOpen(item);
                    }}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    {t("explore.open")}
                  </button>
                  <button
                    className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      logEvent.mutate({ itemId: item.id, event: "save" });
                    }}
                  >
                    <Bookmark className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {feedQuery.hasNextPage && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => feedQuery.fetchNextPage()}
            disabled={feedQuery.isFetchingNextPage}
          >
            {feedQuery.isFetchingNextPage ? t("common.loading") : t("common.loadMore")}
          </Button>
        </div>
      )}
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden bg-card border border-border/30 p-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ t }: { t: (k: string) => string }) {
  return (
    <div className="text-center py-16">
      <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground">{t("explore.empty.noRecommendations")}</p>
      <p className="text-sm text-muted-foreground/60 mt-1">{t("explore.empty.saveContent")}</p>
    </div>
  );
}
