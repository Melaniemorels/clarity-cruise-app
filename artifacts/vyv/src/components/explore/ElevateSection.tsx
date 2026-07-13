import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDevice } from "@/hooks/use-device";
import { Hexagon } from "lucide-react";
import { detectProvider, COMING_SOON_PROVIDERS, PROVIDER_LABEL_KEYS } from "@/lib/external-link";
import { openContent } from "@/lib/open-content";
import { useNavigate } from "react-router-dom";
import { ExplorerContentCard } from "./ExplorerContentCard";
import { explorerText, sectionTitleSize } from "./explorer-tokens";

export interface ElevateItem {
  titleKey: string;
  descKey: string;
  durationMin: number;
  color: string;
  url: string;
}

export const ELEVATE_ITEMS: ElevateItem[] = [
  { titleKey: "elevate.items.deepWork", descKey: "elevate.descs.deepWork", durationMin: 12, color: "from-violet-900/50 to-indigo-900/40", url: "https://www.youtube.com/watch?v=ZD7dXfdDPfg" },
  { titleKey: "elevate.items.weekStructure", descKey: "elevate.descs.weekStructure", durationMin: 8, color: "from-blue-900/50 to-cyan-900/40", url: "https://www.youtube.com/watch?v=o7w5r5PfBKo" },
  { titleKey: "elevate.items.digitalDistraction", descKey: "elevate.descs.digitalDistraction", durationMin: 15, color: "from-emerald-900/50 to-teal-900/40", url: "https://www.youtube.com/watch?v=Hu4Yvq-g7_Y" },
  { titleKey: "elevate.items.idealMorning", descKey: "elevate.descs.idealMorning", durationMin: 10, color: "from-amber-900/50 to-orange-900/40", url: "https://www.youtube.com/watch?v=WtKJrB5rOKs" },
  { titleKey: "elevate.items.energyManagement", descKey: "elevate.descs.energyManagement", durationMin: 12, color: "from-rose-900/50 to-pink-900/40", url: "https://www.youtube.com/watch?v=n3kNlFMXslo" },
  { titleKey: "elevate.items.mentalClarity", descKey: "elevate.descs.mentalClarity", durationMin: 5, color: "from-sky-900/50 to-blue-900/40", url: "https://www.youtube.com/watch?v=lACf4O_eSt0" },
  { titleKey: "elevate.items.focusPsychology", descKey: "elevate.descs.focusPsychology", durationMin: 25, color: "from-purple-900/50 to-violet-900/40", url: "https://www.hubermanlab.com/episode/how-to-focus-to-change-your-brain" },
  { titleKey: "elevate.items.travelProductivity", descKey: "elevate.descs.travelProductivity", durationMin: 6, color: "from-cyan-900/50 to-teal-900/40", url: "https://www.youtube.com/watch?v=2paoNvG5Nmo" },
];

export function ElevateSection() {
  const { t } = useTranslation();
  const device = useDevice();
  const navigate = useNavigate();

  const handleClick = async (item: ElevateItem) => {
    await openContent({ url: item.url, title: t(item.titleKey) }, t);
  };

  return (
    <div id="explore-elevate-section" className={cn("space-y-3", device.isTablet && "space-y-4")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Hexagon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <h2 className={cn(explorerText.sectionTitle, sectionTitleSize(device.isMobile))}>
            {t("elevate.title")}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-primary hover:text-primary/80 font-medium h-7 px-2"
          onClick={() => navigate("/explore/section/elevate")}
        >
          {t("common.viewAll")}
        </Button>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className={cn("flex items-stretch pb-4", device.isMobile ? "gap-3" : "gap-4")}>
          {ELEVATE_ITEMS.map((item, i) => {
            const provider = detectProvider(item.url);
            const showComingSoon = COMING_SOON_PROVIDERS.includes(provider);
            return (
              <ExplorerContentCard
                key={i}
                title={t(item.titleKey)}
                description={t(item.descKey)}
                providerLabelKey={PROVIDER_LABEL_KEYS[provider]}
                durationMin={item.durationMin}
                gradient={item.color}
                icon={Hexagon}
                comingSoon={showComingSoon}
                layout="carousel"
                onOpen={() => handleClick(item)}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
