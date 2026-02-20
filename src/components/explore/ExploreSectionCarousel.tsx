import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDevice, useResponsiveFontSize } from "@/hooks/use-device";
import { openExternal, detectProvider, PROVIDER_LABEL_KEYS } from "@/lib/external-link";
import { toast } from "sonner";
import { useForYouFeed, useLogItemEvent, type ExploreItem } from "@/hooks/use-explore-feed";

export interface SectionConfig {
  key: string;
  title: string;
  subtitle: string;
}

export const EXPLORE_SECTIONS: SectionConfig[] = [
  { key: "Yoga", title: "Yoga", subtitle: "Flexibility & balance" },
  { key: "Pilates", title: "Pilates", subtitle: "Core & posture" },
  { key: "Audiolibros", title: "Audiolibros", subtitle: "Knowledge on demand" },
  { key: "MealPreps", title: "Meal Preps", subtitle: "Nourish your week" },
  { key: "Meditación", title: "Meditación", subtitle: "Stillness & clarity" },
  { key: "Música", title: "Música", subtitle: "Focus & ambiance" },
  { key: "Calma", title: "Calma", subtitle: "Rest & recovery" },
  { key: "Energía", title: "Energía", subtitle: "Movement & vitality" },
];

export function ExploreSectionCarousel({ section }: { section: SectionConfig }) {
  const { t } = useTranslation();
  const device = useDevice();
  const fonts = useResponsiveFontSize();
  const logEvent = useLogItemEvent();
  const { data, isLoading } = useForYouFeed(section.key);

  const handleClick = async (item: ExploreItem) => {
    logEvent.mutate({ itemId: item.id, event: "open" });
    if (!item.url) {
      toast(t("explore.unavailable.title"), {
        description: t("explore.unavailable.comingSoon"),
        duration: 4000,
      });
      return;
    }
    try {
      await openExternal(item.url);
    } catch {
      toast(t("explore.unavailable.title"), {
        description: t("explore.unavailable.error"),
        duration: 4000,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className={cn("flex pb-4", device.isMobile ? "gap-3" : "gap-4")}>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-shrink-0 rounded-2xl overflow-hidden border border-border/50 bg-card",
                device.isMobile ? "w-44" : device.isTablet ? "w-52" : "w-60"
              )}
            >
              <Skeleton className={cn("w-full", device.isMobile ? "h-24" : "h-28")} />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Section header — old money: clean, weighted, no emoji */}
      <div className="flex items-end justify-between">
        <div>
          <h2
            className={cn(
              "font-semibold tracking-tight text-foreground",
              device.isMobile ? "text-base" : "text-lg"
            )}
          >
            {section.title}
          </h2>
          <p className="text-muted-foreground text-[11px] tracking-wide uppercase mt-0.5">
            {section.subtitle}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-[11px] text-muted-foreground hover:text-foreground tracking-wide uppercase h-7 px-2"
        >
          {t("common.viewAll")}
        </Button>
      </div>

      <ScrollArea className="w-full whitespace-nowrap -mx-1 px-1">
        <div className={cn("flex pb-4", device.isMobile ? "gap-3" : "gap-4")}>
          {items.map((item) => {
            const provider = detectProvider(item.url);
            return (
              <div
                key={item.id}
                className={cn(
                  "group flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer",
                  "bg-card border border-border/40 hover:border-border",
                  "transition-all duration-300 hover:shadow-md",
                  device.isMobile ? "w-44" : device.isTablet ? "w-52" : "w-60"
                )}
                onClick={() => handleClick(item)}
              >
                {/* Muted gradient header — old money tones */}
                <div
                  className={cn(
                    "relative flex items-end p-3",
                    "bg-gradient-to-br from-muted/80 to-secondary/60",
                    device.isMobile ? "h-24" : "h-28"
                  )}
                >
                  {/* Duration pill */}
                  {item.duration_min && (
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-medium tracking-wide text-muted-foreground bg-card/80 backdrop-blur-sm rounded-full px-2 py-0.5">
                      {item.duration_min} min
                    </span>
                  )}
                  {/* Provider tag */}
                  <span className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground/70">
                    {t(PROVIDER_LABEL_KEYS[provider])}
                  </span>
                </div>

                {/* Card body */}
                <div className="p-3 space-y-2">
                  <h3
                    className={cn(
                      "font-medium text-foreground leading-snug line-clamp-2 whitespace-normal",
                      device.isMobile ? "text-[13px]" : "text-sm"
                    )}
                  >
                    {item.title}
                  </h3>

                  {item.creator && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {item.creator}
                    </p>
                  )}

                  {/* Actions — minimal, old money */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      className="flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClick(item);
                      }}
                    >
                      <ArrowUpRight className="h-3 w-3" />
                      {t("explore.open")}
                    </button>
                    <button
                      className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        logEvent.mutate({ itemId: item.id, event: "save" });
                      }}
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
