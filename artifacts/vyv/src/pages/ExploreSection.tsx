import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ResponsiveNav, useNavStyle } from "@/components/ResponsiveNav";
import { useDevice } from "@/hooks/use-device";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useSeeAllFeed, useLogItemEvent, type ExploreItem } from "@/hooks/use-explore-feed";
import { useRecommendations, type RecommendationGoal, type Recommendation } from "@/hooks/use-recommendations";
import { openContent } from "@/lib/open-content";
import { detectProvider, PROVIDER_LABEL_KEYS } from "@/lib/external-link";
import { Skeleton } from "@/components/ui/skeleton";
import { EXPLORE_SECTIONS } from "@/components/explore/ExploreSectionCarousel";
import { ELEVATE_ITEMS, type ElevateItem } from "@/components/explore/ElevateSection";
import { ExplorerContentCard } from "@/components/explore/ExplorerContentCard";
import { explorerText, pageTitleSize } from "@/components/explore/explorer-tokens";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useInView } from "react-intersection-observer";

/** Normalize text: lowercase, trim, strip diacritics */
function normalize(text: string): string {
  return text.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Custom hook for debounced value */
function useDebouncedValue(value: string, delay = 250): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

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
  const navStyle = useNavStyle();
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

  const [searchInput, setSearchInput] = useState("");
  const searchQuery = useDebouncedValue(searchInput);

  // For category sections — already uses useInfiniteQuery
  const feedQuery = useSeeAllFeed(sectionConfig ? sectionKey : undefined);

  const sectionTitle = isParaTi
    ? t("mediaConnections.aiRecommendations")
    : isElevate
      ? t("elevate.title")
      : sectionConfig ? t(`explore.categories.${sectionConfig.titleKey}`) : sectionKey;

  const handleOpenItem = (item: { url?: string | null; provider?: string; title?: string }) => {
    openContent(item, t);
  };

  return (
    <div className="min-h-screen bg-background transition-all duration-300" style={navStyle}>
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
          <h1 className={cn(explorerText.pageTitle, device.isMobile ? "text-xl" : "text-2xl")}>
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("explore.searchSection")}
            className="pl-9 pr-9"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
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
  const q = normalize(query);
  return fields.some((f) => f && normalize(f).includes(q));
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

function gridCols(device: ReturnType<typeof useDevice>): string {
  return device.isMobile ? "grid-cols-2" : device.isTablet ? "grid-cols-3" : "grid-cols-4";
}

/* ---------- Sub-grids ---------- */

function ParaTiGrid({ recommendations, isLoading, onOpen, t, searchQuery }: { recommendations: Recommendation[]; isLoading: boolean; onOpen: (item: any) => void; t: (k: string) => string; searchQuery: string }) {
  const device = useDevice();

  const filtered = isLoading ? [] : recommendations.filter((rec) => {
    const url = rec.externalUrl || rec.spotifyUri;
    const provider = url ? detectProvider(url) : "other";
    return matchesSearch(searchQuery, rec.title, rec.description, provider, rec.duration);
  });

  const { visibleCount, hasMore, loadMore } = useProgressiveReveal(filtered.length, !!searchQuery);
  const visible = filtered.slice(0, visibleCount);

  const renderRecCard = useCallback((rec: Recommendation, i: number) => {
    const url = rec.externalUrl || rec.spotifyUri;
    const provider = url ? detectProvider(url) : "other";
    return (
      <ExplorerContentCard
        key={`rec-${i}`}
        title={rec.title}
        description={rec.description}
        providerLabelKey={PROVIDER_LABEL_KEYS[provider]}
        durationLabel={rec.duration}
        layout="grid"
        onOpen={() => onOpen({ url, provider, title: rec.title })}
      />
    );
  }, [onOpen]);

  if (isLoading) return <GridSkeleton />;
  if (filtered.length === 0) return <EmptyState t={t} noResults={!!searchQuery} query={searchQuery} suggestedItems={recommendations.slice(0, 6)} renderCard={renderRecCard} />;

  return (
    <>
      <div className={cn("grid gap-4 items-stretch", gridCols(device))}>
        {visible.map((rec, i) => renderRecCard(rec, i))}
      </div>
      {hasMore && <ScrollSentinel onLoadMore={loadMore} />}
    </>
  );
}

function ElevateGrid({ items, onOpen, t, searchQuery }: { items: ElevateItem[]; onOpen: (item: any) => void; t: (k: string) => string; searchQuery: string }) {
  const device = useDevice();
  const filtered = items.filter((item) =>
    matchesSearch(searchQuery, t(item.titleKey), t(item.descKey), item.duration, detectProvider(item.url))
  );

  const { visibleCount, hasMore, loadMore } = useProgressiveReveal(filtered.length, !!searchQuery);
  const visible = filtered.slice(0, visibleCount);

  const renderElevateCard = useCallback((item: ElevateItem, i: number) => {
    const provider = detectProvider(item.url);
    return (
      <ExplorerContentCard
        key={`elevate-${i}`}
        title={t(item.titleKey)}
        description={t(item.descKey)}
        providerLabelKey={PROVIDER_LABEL_KEYS[provider]}
        durationLabel={item.duration}
        layout="grid"
        onOpen={() => onOpen({ url: item.url, title: t(item.titleKey) })}
      />
    );
  }, [onOpen, t]);

  if (filtered.length === 0) return <EmptyState t={t} noResults={!!searchQuery} query={searchQuery} suggestedItems={items.slice(0, 6)} renderCard={renderElevateCard} />;

  return (
    <>
      <div className={cn("grid gap-4 items-stretch", gridCols(device))}>
        {visible.map((item, i) => renderElevateCard(item, i))}
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

  const renderSectionCard = useCallback((item: ExploreItem, i: number) => {
    const provider = detectProvider(item.url);
    return (
      <ExplorerContentCard
        key={item.id ?? `item-${i}`}
        title={item.title}
        description={item.description}
        providerLabelKey={PROVIDER_LABEL_KEYS[provider]}
        durationMin={item.duration_min}
        curated={item.is_verified}
        layout="grid"
        onOpen={() => {
          logEvent.mutate({ itemId: item.id, event: "open" });
          onOpen(item);
        }}
        onSave={() => logEvent.mutate({ itemId: item.id, event: "save" })}
      />
    );
  }, [logEvent, onOpen]);

  if (feedQuery.isLoading) return <GridSkeleton />;
  if (filtered.length === 0) return <EmptyState t={t} noResults={!!searchQuery && deduped.length > 0} query={searchQuery} suggestedItems={deduped.slice(0, 6)} renderCard={renderSectionCard} />;

  return (
    <>
      <div className={cn("grid gap-4 items-stretch", gridCols(device))}>
        {filtered.map((item, i) => renderSectionCard(item, i))}
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

function EmptyState({ t, noResults, query, suggestedItems, renderCard }: {
  t: (k: string, opts?: any) => string;
  noResults?: boolean;
  query?: string;
  suggestedItems?: any[];
  renderCard?: (item: any, i: number) => React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center py-10">
        <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        {noResults && query ? (
          <>
            <p className="text-muted-foreground">{t("explore.empty.noResultsFor", { query })}</p>
            <p className="text-sm text-muted-foreground/60 mt-1">{t("explore.empty.tryAnother")}</p>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">{t("explore.empty.noRecommendations")}</p>
            <p className="text-sm text-muted-foreground/60 mt-1">{t("explore.empty.saveContent")}</p>
          </>
        )}
      </div>
      {noResults && suggestedItems && suggestedItems.length > 0 && renderCard && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{t("explore.empty.maybeInterest")}</p>
          <div className="grid grid-cols-2 gap-4 items-stretch">
            {suggestedItems.slice(0, 6).map((item, i) => renderCard(item, i))}
          </div>
        </div>
      )}
    </div>
  );
}
