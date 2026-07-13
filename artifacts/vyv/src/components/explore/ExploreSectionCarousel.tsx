import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, Headphones, Salad, ClipboardList, Dumbbell, Brain, Flame, Wind, Hexagon, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDevice } from "@/hooks/use-device";
import { detectProvider, PROVIDER_LABEL_KEYS } from "@/lib/external-link";
import { openContent } from "@/lib/open-content";
import { useForYouFeed, useLogItemEvent, type ExploreItem } from "@/hooks/use-explore-feed";
import { useNavigate } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { ExplorerContentCard, type ExplorerCardIcon } from "./ExplorerContentCard";
import { explorerText, sectionTitleSize } from "./explorer-tokens";
import { useExplorerCardActions, catalogueRef } from "./use-explorer-card-actions";

export interface SectionConfig {
  key: string;
  titleKey: string;
  icon: string;
}

// Gradient palettes per section for the old-money colored cards
const SECTION_GRADIENTS: Record<string, string[]> = {
  Música: [
    "from-purple-900/60 to-pink-900/40",
    "from-emerald-900/50 to-teal-900/40",
    "from-indigo-900/50 to-purple-900/40",
  ],
  Audiolibros: [
    "from-amber-900/50 to-yellow-900/40",
    "from-teal-900/50 to-emerald-900/40",
    "from-cyan-900/50 to-teal-900/40",
  ],
  Yoga: [
    "from-teal-900/50 to-emerald-900/40",
    "from-purple-900/50 to-indigo-900/40",
    "from-amber-900/50 to-orange-900/40",
  ],
  Pilates: [
    "from-rose-900/50 to-pink-900/40",
    "from-sky-900/50 to-blue-900/40",
    "from-violet-900/50 to-purple-900/40",
  ],
  Meditación: [
    "from-indigo-900/50 to-blue-900/40",
    "from-teal-900/50 to-cyan-900/40",
    "from-purple-900/50 to-violet-900/40",
  ],
  Calma: [
    "from-sky-900/50 to-blue-900/40",
    "from-emerald-900/50 to-teal-900/40",
    "from-indigo-900/50 to-purple-900/40",
  ],
  Energía: [
    "from-orange-900/50 to-amber-900/40",
    "from-red-900/50 to-rose-900/40",
    "from-yellow-900/50 to-amber-900/40",
  ],
  Ejercicios: [
    "from-sky-900/50 to-indigo-900/40",
    "from-emerald-900/50 to-teal-900/40",
    "from-amber-900/50 to-orange-900/40",
  ],
  Podcasts: [
    "from-violet-900/50 to-purple-900/40",
    "from-rose-900/50 to-pink-900/40",
    "from-slate-800/50 to-zinc-900/40",
  ],
  Nutrición: [
    "from-green-900/50 to-emerald-900/40",
    "from-amber-900/50 to-yellow-900/40",
    "from-rose-900/40 to-purple-900/40",
  ],
  PlanesDeComida: [
    "from-teal-900/50 to-green-900/40",
    "from-amber-900/50 to-orange-900/40",
    "from-indigo-900/50 to-violet-900/40",
  ],
  MealPreps: [
    "from-teal-900/50 to-green-900/40",
    "from-amber-900/50 to-orange-900/40",
    "from-indigo-900/50 to-violet-900/40",
  ],
  Motivacional: [
    "from-zinc-900/70 to-stone-900/60",
    "from-red-900/50 to-amber-900/40",
    "from-slate-900/60 to-zinc-800/50",
  ],
};

const SECTION_ICONS: Record<string, ExplorerCardIcon> = {
  Música: Music,
  Audiolibros: Headphones,
  Yoga: Dumbbell,
  Pilates: Dumbbell,
  Meditación: Brain,
  Calma: Wind,
  Energía: Flame,
  Ejercicios: Dumbbell,
  Podcasts: Headphones,
  Nutrición: Salad,
  PlanesDeComida: ClipboardList,
  MealPreps: ClipboardList,
  Motivacional: Megaphone,
};

// Curated sections only — each backed by real content in the DB.
export const EXPLORE_SECTIONS: SectionConfig[] = [
  { key: "PlanesDeComida", titleKey: "mealPlans", icon: "clipboard" },
  { key: "Yoga", titleKey: "yoga", icon: "dumbbell" },
  { key: "Motivacional", titleKey: "motivational", icon: "megaphone" },
  { key: "Podcasts", titleKey: "podcasts", icon: "headphones" },
  { key: "Música", titleKey: "music", icon: "music" },
  { key: "Audiolibros", titleKey: "audiobooks", icon: "headphones" },
];

export function ExploreSectionCarousel({
  section,
  onSectionVisible,
  onSectionHidden,
}: {
  section: SectionConfig;
  onSectionVisible?: (category: string) => void;
  onSectionHidden?: (category: string) => void;
}) {
  const { t } = useTranslation();
  const device = useDevice();
  const logEvent = useLogItemEvent();
  const navigate = useNavigate();
  const { data, isLoading } = useForYouFeed(section.key);
  const { buildMenu, recordOpen } = useExplorerCardActions();

  // Track section visibility for dwell time
  const { ref: sectionRef, inView } = useInView({ threshold: 0.3 });
  const wasInViewRef = useRef(false);

  useEffect(() => {
    if (inView && !wasInViewRef.current) {
      wasInViewRef.current = true;
      onSectionVisible?.(section.key);
    } else if (!inView && wasInViewRef.current) {
      wasInViewRef.current = false;
      onSectionHidden?.(section.key);
    }
  }, [inView, section.key, onSectionVisible, onSectionHidden]);

  const gradients = SECTION_GRADIENTS[section.key] ?? [
    "from-muted/80 to-secondary/60",
    "from-muted/60 to-secondary/40",
    "from-muted/70 to-secondary/50",
  ];
  const IconComponent = SECTION_ICONS[section.key] ?? Hexagon;

  const handleClick = async (item: ExploreItem) => {
    logEvent.mutate({ itemId: item.id, event: "open" });
    recordOpen(catalogueRef(item));
    await openContent({ url: item.url, provider: detectProvider(item.url).toString(), title: item.title }, t);
  };

  const header = (
    <div className="flex items-center gap-2.5">
      <IconComponent className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
      <h2 className={cn(explorerText.sectionTitle, sectionTitleSize(device.isMobile))}>
        {t(`explore.categories.${section.titleKey}`)}
      </h2>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className={cn("flex pb-4", device.isMobile ? "gap-3" : "gap-4")}>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-shrink-0 rounded-2xl overflow-hidden border border-border/30 bg-card",
                device.isMobile ? "w-[180px]" : device.isTablet ? "w-[220px]" : "w-[260px]"
              )}
            >
              <Skeleton className={cn("w-full", device.isMobile ? "h-[120px]" : "h-[140px]")} />
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
  if (items.length === 0) {
    return (
      <div ref={sectionRef} className="space-y-3">
        {header}
        <div className="rounded-2xl border border-dashed border-border/40 bg-muted/20 p-5 text-center">
          <p className="text-sm text-muted-foreground">{t("explore.sectionEmpty")}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="space-y-4">
      <div className="flex items-center justify-between">
        {header}
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-primary hover:text-primary/80 font-medium h-7 px-2"
          onClick={() => navigate(`/explore/section/${section.key}`)}
        >
          {t("common.viewAll")}
        </Button>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className={cn("flex items-stretch pb-4", device.isMobile ? "gap-3" : "gap-4")}>
          {items.map((item, idx) => (
            <ExplorerContentCard
              key={item.id}
              title={item.title}
              description={item.description}
              providerLabelKey={PROVIDER_LABEL_KEYS[detectProvider(item.url)]}
              durationMin={item.duration_min}
              language={item.language}
              curated={item.is_verified}
              thumbnail={item.thumbnail}
              gradient={gradients[idx % gradients.length]}
              icon={IconComponent}
              layout="carousel"
              onOpen={() => handleClick(item)}
              menu={buildMenu(catalogueRef(item))}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
