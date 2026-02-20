import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDevice, useResponsiveFontSize } from "@/hooks/use-device";
import { openExternal, detectProvider, COMING_SOON_PROVIDERS, PROVIDER_LABEL_KEYS } from "@/lib/external-link";
import { toast } from "sonner";
import { useForYouFeed, useLogItemEvent, type ExploreItem } from "@/hooks/use-explore-feed";

interface SectionConfig {
  key: string;
  label: string;
  icon: string;
  gradient: string;
}

export const EXPLORE_SECTIONS: SectionConfig[] = [
  { key: "Yoga", label: "🧘 Yoga", icon: "🧘", gradient: "from-purple-500/20 to-pink-500/20" },
  { key: "Pilates", label: "💪 Pilates", icon: "💪", gradient: "from-rose-500/20 to-orange-500/20" },
  { key: "Audiolibros", label: "📚 Audiolibros", icon: "📚", gradient: "from-amber-500/20 to-yellow-500/20" },
  { key: "MealPreps", label: "🥗 Meal Preps", icon: "🥗", gradient: "from-lime-500/20 to-green-500/20" },
  { key: "Meditación", label: "🧠 Meditación", icon: "🧠", gradient: "from-blue-500/20 to-indigo-500/20" },
  { key: "Música", label: "🎵 Música", icon: "🎵", gradient: "from-violet-500/20 to-purple-500/20" },
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
      <div className={cn("space-y-3", device.isTablet && "space-y-4")}>
        <Skeleton className="h-6 w-40" />
        <div className={cn("flex pb-4", device.isMobile ? "gap-3" : "gap-4")}>
          {[...Array(3)].map((_, i) => (
            <Card key={i} className={cn("flex-shrink-0 overflow-hidden bg-theme-cardBg", device.isMobile ? "w-40" : device.isTablet ? "w-48" : "w-56")} style={{ borderRadius: "18px" }}>
              <Skeleton className={cn("w-full", device.isMobile ? "h-28" : device.isTablet ? "h-32" : "h-36")} />
              <CardContent className={device.isMobile ? "p-3" : "p-4"}>
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <div className={cn("space-y-3", device.isTablet && "space-y-4")}>
      <div className="flex items-center justify-between">
        <h2 className={cn("font-semibold flex items-center gap-2 text-theme-textPrimary", fonts.heading3)}>
          <span className={device.isMobile ? "text-xl" : "text-2xl"}>{section.icon}</span>
          {section.label.replace(/^. /, "")}
        </h2>
        <Button variant="ghost" size="sm">{t("common.viewAll")}</Button>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className={cn("flex pb-4", device.isMobile ? "gap-3" : "gap-4")}>
          {items.map((item) => {
            const provider = detectProvider(item.url);
            const showComingSoon = COMING_SOON_PROVIDERS.includes(provider);
            return (
              <Card
                key={item.id}
                className={cn(
                  "flex-shrink-0 overflow-hidden cursor-pointer transition-all hover:scale-[1.02] bg-theme-cardBg",
                  device.isMobile ? "w-40" : device.isTablet ? "w-48" : "w-56"
                )}
                style={{ borderRadius: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                onClick={() => handleClick(item)}
              >
                <div className={cn(
                  "bg-gradient-to-br flex items-center justify-center",
                  section.gradient,
                  device.isMobile ? "h-28" : device.isTablet ? "h-32" : "h-36"
                )}>
                  <div className={device.isMobile ? "text-3xl" : "text-4xl"}>{section.icon}</div>
                </div>
                <CardContent className={device.isMobile ? "p-3" : "p-4"}>
                  <h3 className={cn("font-medium mb-0.5 truncate text-theme-textPrimary", fonts.small)}>
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Badge variant="outline" className="text-[9px] capitalize px-1.5 py-0 font-normal">
                      {t(PROVIDER_LABEL_KEYS[provider])}
                    </Badge>
                    {item.duration_min && (
                      <span className={cn("text-theme-textSecondary", device.isMobile ? "text-[10px]" : "text-xs")}>
                        {item.duration_min} min
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 gap-1 text-[10px] text-theme-textSecondary hover:text-theme-textPrimary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClick(item);
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                      {t("explore.open")}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        logEvent.mutate({ itemId: item.id, event: "save" });
                      }}
                    >
                      <Bookmark className="h-3 w-3" />
                    </Button>
                  </div>
                  {showComingSoon && (
                    <p className="text-[9px] text-theme-textSecondary/60 mt-1.5 leading-tight">
                      {t("explore.integrationComingSoon")}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
