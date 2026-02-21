import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDevice, useResponsiveFontSize } from "@/hooks/use-device";
import { Hexagon, Bookmark, ExternalLink } from "lucide-react";
import { detectProvider, COMING_SOON_PROVIDERS, PROVIDER_LABEL_KEYS } from "@/lib/external-link";
import { openContent } from "@/lib/open-content";
import { useNavigate } from "react-router-dom";

interface ElevateItem {
  titleKey: string;
  descKey: string;
  duration: string;
  color: string;
  url: string;
}

const ELEVATE_ITEMS: ElevateItem[] = [
  { titleKey: "elevate.items.deepWork", descKey: "elevate.descs.deepWork", duration: "12 min", color: "from-violet-500/20 to-indigo-500/20", url: "https://www.youtube.com/watch?v=ZD7dXfdDPfg" },
  { titleKey: "elevate.items.weekStructure", descKey: "elevate.descs.weekStructure", duration: "8 min", color: "from-blue-500/20 to-cyan-500/20", url: "https://www.youtube.com/watch?v=o7w5r5PfBKo" },
  { titleKey: "elevate.items.digitalDistraction", descKey: "elevate.descs.digitalDistraction", duration: "15 min", color: "from-emerald-500/20 to-teal-500/20", url: "https://www.youtube.com/watch?v=Hu4Yvq-g7_Y" },
  { titleKey: "elevate.items.idealMorning", descKey: "elevate.descs.idealMorning", duration: "10 min", color: "from-amber-500/20 to-orange-500/20", url: "https://www.youtube.com/watch?v=WtKJrB5rOKs" },
  { titleKey: "elevate.items.energyManagement", descKey: "elevate.descs.energyManagement", duration: "7 min", color: "from-rose-500/20 to-pink-500/20", url: "https://www.youtube.com/watch?v=jDGMuwBuC9o" },
  { titleKey: "elevate.items.mentalClarity", descKey: "elevate.descs.mentalClarity", duration: "5 min", color: "from-sky-500/20 to-blue-500/20", url: "https://www.youtube.com/watch?v=lACf4O_eSt0" },
  { titleKey: "elevate.items.focusPsychology", descKey: "elevate.descs.focusPsychology", duration: "25 min", color: "from-purple-500/20 to-violet-500/20", url: "https://www.hubermanlab.com/episode/how-to-focus-to-change-your-brain" },
  { titleKey: "elevate.items.travelProductivity", descKey: "elevate.descs.travelProductivity", duration: "6 min", color: "from-cyan-500/20 to-teal-500/20", url: "https://www.youtube.com/watch?v=2paoNvG5Nmo" },
];

export function ElevateSection() {
  const { t } = useTranslation();
  const device = useDevice();
  const fonts = useResponsiveFontSize();
  const navigate = useNavigate();

  const handleClick = async (url: string) => {
    await openContent({ url, title: "" }, t);
  };

  return (
    <div className={cn("space-y-3", device.isTablet && "space-y-4")}>
      <div className="flex items-center justify-between">
        <h2 className={cn("font-semibold flex items-center gap-2 text-theme-textPrimary", fonts.heading3)}>
          <Hexagon className={device.isMobile ? "h-5 w-5" : "h-6 w-6"} strokeWidth={1.5} />
          {t("elevate.title")}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => navigate("/explore/section/elevate")}>{t("common.viewAll")}</Button>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className={cn("flex pb-4", device.isMobile ? "gap-3" : "gap-4")}>
          {ELEVATE_ITEMS.map((item, i) => {
            const provider = detectProvider(item.url);
            const showComingSoon = COMING_SOON_PROVIDERS.includes(provider);
            return (
            <Card
              key={i}
              className={cn(
                "flex-shrink-0 overflow-hidden cursor-pointer transition-all hover:scale-[1.02] bg-theme-cardBg",
                device.isMobile ? "w-40" : device.isTablet ? "w-48" : "w-56"
              )}
              style={{ borderRadius: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              onClick={() => handleClick(item.url)}
            >
              <div className={cn(
                "bg-gradient-to-br flex items-center justify-center",
                item.color,
                device.isMobile ? "h-28" : device.isTablet ? "h-32" : "h-36"
              )}>
                <Hexagon className={device.isMobile ? "h-8 w-8" : "h-10 w-10"} strokeWidth={1} />
              </div>
              <CardContent className={device.isMobile ? "p-3" : "p-4"}>
                <h3 className={cn("font-medium mb-0.5 truncate text-theme-textPrimary", fonts.small)}>
                  {t(item.titleKey)}
                </h3>
                <p className={cn("text-theme-textSecondary truncate mb-1", device.isMobile ? "text-[10px]" : "text-xs")}>
                  {t(item.descKey)}
                </p>
                <div className="flex items-center gap-1 mb-1.5">
                  <Badge variant="outline" className="text-[9px] capitalize px-1.5 py-0 font-normal">
                    {t(PROVIDER_LABEL_KEYS[provider])}
                  </Badge>
                  <span className={cn("text-theme-textSecondary", device.isMobile ? "text-[10px]" : "text-xs")}>
                    {item.duration}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 gap-1 text-[10px] text-theme-textSecondary hover:text-theme-textPrimary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClick(item.url);
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t('explore.open')}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    <Bookmark className="h-3 w-3" />
                  </Button>
                </div>
                {showComingSoon && (
                  <p className="text-[9px] text-theme-textSecondary/60 mt-1.5 leading-tight">
                    {t('explore.integrationComingSoon')}
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
