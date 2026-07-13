import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDevice } from "@/hooks/use-device";
import { useExplorerContextualRecs, useRefreshContextualRecs, type ContextualRec } from "@/hooks/use-contextual-recommendations";
import { openContent } from "@/lib/open-content";
import { detectProvider, PROVIDER_LABEL_KEYS } from "@/lib/external-link";
import { Brain, RefreshCw, Calendar } from "lucide-react";
import { toast } from "sonner";
import { ExplorerContentCard } from "./ExplorerContentCard";
import { explorerText, sectionTitleSize } from "./explorer-tokens";
import { categoryLabelKey } from "@/lib/explore-categories";
import { translateReason } from "@/lib/explore-reasons";
import { useExplorerCardActions, urlRef } from "./use-explorer-card-actions";
import type { ExplorerItemRef } from "@/hooks/use-saved-items";

const MOOD_GRADIENTS: Record<string, string> = {
  calm: "from-green-900/50 to-teal-900/40",
  energizing: "from-orange-900/50 to-amber-900/40",
  focused: "from-blue-900/50 to-indigo-900/40",
  uplifting: "from-amber-900/50 to-rose-900/40",
  relaxing: "from-purple-900/50 to-violet-900/40",
};

function ContextualCard({ rec }: { rec: ContextualRec }) {
  const { t } = useTranslation();
  const { buildMenu, recordOpen } = useExplorerCardActions();

  const gradient = MOOD_GRADIENTS[rec.mood] ?? "from-muted/80 to-secondary/60";
  const provider = rec.url ? detectProvider(rec.url) : "other";

  // Contextual recs are real catalogue items — item_id points at explore_items.
  const itemRef: ExplorerItemRef | null = (rec as any).item_id
    ? {
        provider: "vyv",
        providerItemId: (rec as any).item_id,
        title: rec.title,
        url: rec.url ?? null,
        category: rec.category ?? null,
        durationMin: rec.duration_min ?? null,
      }
    : rec.url
      ? urlRef({
          url: rec.url,
          provider,
          title: rec.title,
          category: rec.category ?? null,
          durationMin: rec.duration_min ?? null,
        })
      : null;

  const handleClick = async () => {
    if (rec.url) {
      if (itemRef) recordOpen(itemRef);
      await openContent({ url: rec.url, provider, title: rec.title }, t);
    }
  };

  return (
    <ExplorerContentCard
      title={rec.title}
      reason={translateReason(t, rec.reason)}
      providerLabelKey={rec.url ? PROVIDER_LABEL_KEYS[provider] : null}
      categoryLabelKey={categoryLabelKey(rec.category)}
      durationMin={rec.duration_min}
      gradient={gradient}
      icon={Brain}
      layout="carousel"
      onOpen={handleClick}
      menu={itemRef ? buildMenu(itemRef) : undefined}
    />
  );
}

export function ExplorerContextualRecs({
  refreshSignal,
}: {
  /** Bump this counter to force a refresh excluding the items on screen. */
  refreshSignal?: number;
} = {}) {
  const { t } = useTranslation();
  const device = useDevice();
  const { data, isLoading, error } = useExplorerContextualRecs();
  const refreshMutation = useRefreshContextualRecs();

  const recs = data?.recommendations?.explorer ?? [];
  const hasCalendar = !!(data?.signals as any)?.calendar?.next_event_title;

  const handleRefresh = () => {
    // Send the ids currently on screen so the refresh shows different items.
    const excludeIds = recs
      .map((r) => (r as { item_id?: string }).item_id)
      .filter((id): id is string => !!id);
    refreshMutation.mutate(
      { target: "explorer", excludeIds },
      {
        onSuccess: () => toast.success(t("recommendations.refreshed")),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  // Full-page refresh: when the signal bumps, refresh excluding what's shown.
  const recsRef = useRef(recs);
  recsRef.current = recs;
  useEffect(() => {
    if (!refreshSignal || refreshSignal <= 0) return;
    const excludeIds = recsRef.current
      .map((r) => (r as { item_id?: string }).item_id)
      .filter((id): id is string => !!id);
    refreshMutation.mutate(
      { target: "explorer", excludeIds },
      { onError: (err) => toast.error(err.message) },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  if (!isLoading && recs.length === 0 && !error) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2.5">
            <Brain className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <h2 className={cn(explorerText.sectionTitle, sectionTitleSize(device.isMobile))}>
              {t("contextualRecs.explorerTitle")}
            </h2>
          </div>
          {hasCalendar && (
            <Badge variant="secondary" className="text-[9px] gap-0.5 px-1.5 py-0">
              <Calendar className="h-2.5 w-2.5" />
              {t("contextualRecs.calendarBased")}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleRefresh}
          disabled={refreshMutation.isPending || isLoading}
        >
          <RefreshCw
            className={cn("h-4 w-4", (refreshMutation.isPending || isLoading) && "animate-spin")}
          />
        </Button>
      </div>

      <p className={cn(explorerText.sectionSubtitle, "-mt-1")}>
        {t("contextualRecs.explorerSubtitle")}
      </p>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className={cn("flex items-stretch pb-4", device.isMobile ? "gap-3" : "gap-4")}>
          {isLoading
            ? [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-shrink-0 rounded-2xl overflow-hidden border border-border/30 bg-card",
                    device.isMobile ? "w-[180px]" : "w-[220px]"
                  )}
                >
                  <Skeleton className={cn("w-full", device.isMobile ? "h-[120px]" : "h-[140px]")} />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            : error
              ? (
                <Card className="flex-shrink-0 rounded-2xl min-w-[200px]">
                  <CardContent className="py-6 text-center">
                    <p className="text-sm text-destructive mb-2">{error.message}</p>
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                      {t("common.retry")}
                    </Button>
                  </CardContent>
                </Card>
              )
              : recs.map((rec, idx) => <ContextualCard key={idx} rec={rec} />)}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
