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
import { detectProvider, PROVIDER_LABEL_KEYS } from "@/lib/external-link";
import { Skeleton } from "@/components/ui/skeleton";
import { EXPLORE_SECTIONS } from "@/components/explore/ExploreSectionCarousel";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useInView } from "react-intersection-observer";

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

const PAGE_SIZE = 12;

export default function ExploreSection() {
  const { sectionKey } = useParams<{ sectionKey: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const device = useDevice();
  const navPadding = useNavPadding();
  const logEvent = useLogItemEvent();

  const stateFilter = (location.state as any)?.filter as string | undefined;

  const isParaTi = sectionKey === "para_ti";
  const isElevate = sectionKey === "elevate";
  const sectionConfig = !isParaTi && !isElevate
    ? EXPLORE_SECTIONS.find((s) => s.key === sectionKey)
    : null;

  const [selectedGoal, setSelectedGoal] = useState<RecommendationGoal>(
    (stateFilter as RecommendationGoal) || "auto"
  );
  const recQuery = useRecommendations(isParaTi ? selectedGoal : "auto");

  const [searchQuery, setSearchQuery] = useState("");

  // For category sections — already uses useInfiniteQuery
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("explore.searchSection")}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content grid */}
        {isParaTi && <ParaTiGrid recommendations={recQuery.data?.recommendations ?? []} isLoading={recQuery.isLoading} onOpen={handleOpenItem} t={t} searchQuery={searchQuery} />}
        {isElevate && <ElevateGrid items={ELEVATE_ITEMS} onOpen={handleOpenItem} t={t} searchQuery={searchQuery} />}
        {sectionConfig && <SectionGrid feedQuery={feedQuery} logEvent={logEvent} onOpen={handleOpenItem} t={t} searchQuery={searchQuery} />}

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

/* ---------- Helpers ---------- */

function matchesSearch(query: string, ...fields: (string | undefined | null)[]): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(q));
}

/** Hook for client-side progressive reveal (simulates pagination for static/small arrays) */
function useProgressiveReveal(totalCount: number, searchActive: boolean) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset when search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchActive]);

  const hasMore = visibleCount < totalCount;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, totalCount));
  }, [totalCount]);

  return { visibleCount, hasMore, loadMore };
}

/** Sentinel component that triggers loadMore when scrolled into view */
function ScrollSentinel({ onLoadMore, isLoading }: { onLoadMore: () => void; isLoading?: boolean }) {
  const { ref, inView } = useInView({ threshold: 0, rootMargin: "200px" });

  useEffect(() => {
    if (inView && !isLoading) {
      onLoadMore();
    }
  }, [inView, isLoading, onLoadMore]);

  return (
    <div ref={ref} className="py-4">
      {isLoading && <LoadingIndicator />}
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden bg-card border border-border/30 p-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/* ---------- Sub-grids ---------- */

function ParaTiGrid({ recommendations, isLoading, onOpen, t, searchQuery }: { recommendations: Recommendation[]; isLoading: boolean; onOpen: (item: any) => void; t: (k: string) => string; searchQuery: string }) {
  const device = useDevice();
  if (isLoading) return <GridSkeleton />;

  const filtered = recommendations.filter((rec) => {
    const url = rec.externalUrl || rec.spotifyUri;
    const provider = url ? detectProvider(url) : "other";
    return matchesSearch(searchQuery, rec.title, rec.description, provider, rec.duration);
  });

  const { visibleCount, hasMore, loadMore } = useProgressiveReveal(filtered.length, !!searchQuery);
  const visible = filtered.slice(0, visibleCount);

  if (filtered.length === 0) return <EmptyState t={t} noResults={!!searchQuery} />;

  return (
    <>
      <div className={cn("grid gap-4", device.isMobile ? "grid-cols-2" : device.isTablet ? "grid-cols-3" : "grid-cols-4")}>
        {visible.map((rec, i) => {
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
      {hasMore && <ScrollSentinel onLoadMore={loadMore} />}
    </>
  );
}

function ElevateGrid({ items, onOpen, t, searchQuery }: { items: typeof ELEVATE_ITEMS; onOpen: (item: any) => void; t: (k: string) => string; searchQuery: string }) {
  const device = useDevice();
  const filtered = items.filter((item) =>
    matchesSearch(searchQuery, item.title, item.duration, detectProvider(item.url))
  );

  const { visibleCount, hasMore, loadMore } = useProgressiveReveal(filtered.length, !!searchQuery);
  const visible = filtered.slice(0, visibleCount);

  if (filtered.length === 0) return <EmptyState t={t} noResults={!!searchQuery} />;

  return (
    <>
      <div className={cn("grid gap-4", device.isMobile ? "grid-cols-2" : device.isTablet ? "grid-cols-3" : "grid-cols-4")}>
        {visible.map((item, i) => {
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
      {hasMore && <ScrollSentinel onLoadMore={loadMore} />}
    </>
  );
}

function SectionGrid({ feedQuery, logEvent, onOpen, t, searchQuery }: { feedQuery: any; logEvent: any; onOpen: (item: any) => void; t: (k: string) => string; searchQuery: string }) {
  const device = useDevice();
  const allItems: ExploreItem[] = feedQuery.data?.pages?.flatMap((p: any) => p.items) ?? [];

  // Deduplicate by id
  const deduped = useMemo(() => {
    const seen = new Set<string>();
    return allItems.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [allItems]);

  const filtered = useMemo(() =>
    deduped.filter((item) =>
      matchesSearch(searchQuery, item.title, item.url, item.creator, item.tags?.join(" "), item.duration_min?.toString())
    ),
    [deduped, searchQuery]
  );

  // Auto-fetch next page callback
  const handleLoadMore = useCallback(() => {
    if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage && !searchQuery) {
      feedQuery.fetchNextPage();
    }
  }, [feedQuery.hasNextPage, feedQuery.isFetchingNextPage, feedQuery.fetchNextPage, searchQuery]);

  if (feedQuery.isLoading) return <GridSkeleton />;
  if (filtered.length === 0) return <EmptyState t={t} noResults={!!searchQuery && deduped.length > 0} />;

  return (
    <>
      <div className={cn("grid gap-4", device.isMobile ? "grid-cols-2" : device.isTablet ? "grid-cols-3" : "grid-cols-4")}>
        {filtered.map((item) => {
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
        <ScrollSentinel onLoadMore={handleLoadMore} isLoading={feedQuery.isFetchingNextPage} />
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

function EmptyState({ t, noResults }: { t: (k: string) => string; noResults?: boolean }) {
  return (
    <div className="text-center py-16">
      <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground">{noResults ? t("explore.empty.noResults") : t("explore.empty.noRecommendations")}</p>
      {!noResults && <p className="text-sm text-muted-foreground/60 mt-1">{t("explore.empty.saveContent")}</p>}
    </div>
  );
}
