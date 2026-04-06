import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDevice, useResponsiveFontSize } from "@/hooks/use-device";
import { useExplorerContextualRecs, useRefreshContextualRecs, type ContextualRec } from "@/hooks/use-contextual-recommendations";
import { openContent } from "@/lib/open-content";
import { detectProvider, PROVIDER_LABEL_KEYS } from "@/lib/external-link";
import { Brain, RefreshCw, Clock, ArrowUpRight, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";

const MOOD_GRADIENTS: Record<string, string> = {
  calm: "from-green-900/50 to-teal-900/40",
  energizing: "from-orange-900/50 to-amber-900/40",
  focused: "from-blue-900/50 to-indigo-900/40",
  uplifting: "from-amber-900/50 to-rose-900/40",
  relaxing: "from-purple-900/50 to-violet-900/40",
};

function ContextualCard({ rec }: { rec: ContextualRec }) {
  const { t } = useTranslation();
  const device = useDevice();

  const gradient = MOOD_GRADIENTS[rec.mood] ?? "from-muted/80 to-secondary/60";
  const provider = rec.url ? detectProvider(rec.url) : "other";

  const handleClick = () => {
    if (rec.url) {
      openContent({ url: rec.url, provider, title: rec.title }, t);
    }
  };

  return (
    <div
      className={cn(
        "group flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer",
        "bg-card border border-border/30",
        "transition-all duration-300 hover:border-border/60 hover:shadow-lg",
        device.isMobile ? "w-[200px]" : device.isTablet ? "w-[240px]" : "w-[280px]"
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-1",
          `bg-gradient-to-br ${gradient}`,
          device.isMobile ? "h-[100px]" : "h-[120px]"
        )}
      >
        <Brain className="h-8 w-8 text-foreground/40" strokeWidth={1.5} />
        {rec.duration_min && (
          <span className="absolute top-2.5 right-2.5 text-[10px] font-medium tracking-wide text-muted-foreground bg-card/70 backdrop-blur-sm rounded-full px-2 py-0.5">
            <Clock className="h-2.5 w-2.5 inline mr-0.5" />
            {rec.duration_min} min
          </span>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        <h3
          className={cn(
            "font-semibold text-foreground leading-snug line-clamp-2 whitespace-normal",
            device.isMobile ? "text-[13px]" : "text-sm"
          )}
        >
          {rec.title}
        </h3>

        <p className="text-[10px] text-muted-foreground line-clamp-2 whitespace-normal">
          {rec.reason}
        </p>

        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[9px] capitalize px-1.5 py-0 font-normal">
            {rec.category}
          </Badge>
          {rec.url && (
            <span className="text-[10px] font-medium tracking-wide bg-foreground/10 text-foreground/70 rounded px-1.5 py-0.5">
              {t(PROVIDER_LABEL_KEYS[provider])}
            </span>
          )}
        </div>

        {rec.url && (
          <div className="flex items-center pt-0.5">
            <button
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              {t("explore.open")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ExplorerContextualRecs() {
  const { t } = useTranslation();
  const device = useDevice();
  const fonts = useResponsiveFontSize();
  const { data, isLoading, error } = useExplorerContextualRecs();
  const refreshMutation = useRefreshContextualRecs();

  const recs = data?.recommendations?.explorer ?? [];
  const hasCalendar = !!(data?.signals as any)?.calendar?.next_event_title;

  const handleRefresh = () => {
    refreshMutation.mutate("explorer", {
      onSuccess: () => toast.success(t("recommendations.refreshed")),
      onError: (err) => toast.error(err.message),
    });
  };

  if (!isLoading && recs.length === 0 && !error) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2
            className={cn(
              "font-semibold flex items-center gap-2 text-foreground",
              fonts.heading3
            )}
          >
            <span className={device.isMobile ? "text-xl" : "text-2xl"}>🧠</span>
            {t("contextualRecs.explorerTitle")}
          </h2>
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

      <p className="text-xs text-muted-foreground -mt-1">
        {t("contextualRecs.explorerSubtitle")}
      </p>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className={cn("flex pb-4", device.isMobile ? "gap-3" : "gap-4")}>
          {isLoading
            ? [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-shrink-0 rounded-2xl overflow-hidden border border-border/30 bg-card",
                    device.isMobile ? "w-[200px]" : "w-[240px]"
                  )}
                >
                  <Skeleton className={cn("w-full", device.isMobile ? "h-[100px]" : "h-[120px]")} />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            : error
              ? (
                <Card className="flex-shrink-0 min-w-[200px]" style={{ borderRadius: "18px" }}>
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
