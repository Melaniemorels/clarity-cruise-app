import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark, ArrowUpRight, Music, Headphones, Salad, ClipboardList, Dumbbell, Brain, Flame, Wind, Hexagon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDevice } from "@/hooks/use-device";
import { detectProvider, PROVIDER_LABEL_KEYS } from "@/lib/external-link";
import { openContent } from "@/lib/open-content";
import { useForYouFeed, useLogItemEvent, type ExploreItem } from "@/hooks/use-explore-feed";
import { useNavigate } from "react-router-dom";
import { useInView } from "react-intersection-observer";

export interface SectionConfig {
  key: string;
  titleKey: string;
  icon: string;
  emoji: string;
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
};

const SECTION_ICONS: Record<string, React.ElementType> = {
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
};

export const EXPLORE_SECTIONS: SectionConfig[] = [
  { key: "Música", titleKey: "music", icon: "music", emoji: "🎵" },
  { key: "Audiolibros", titleKey: "audiobooks", icon: "headphones", emoji: "🎧" },
  { key: "Podcasts", titleKey: "podcasts", icon: "headphones", emoji: "🎙️" },
  { key: "Yoga", titleKey: "yoga", icon: "dumbbell", emoji: "🧘" },
  { key: "Pilates", titleKey: "pilates", icon: "dumbbell", emoji: "💪" },
  { key: "Meditación", titleKey: "meditation", icon: "brain", emoji: "🧠" },
  { key: "Calma", titleKey: "calm", icon: "wind", emoji: "🌿" },
  { key: "Energía", titleKey: "energy", icon: "flame", emoji: "⚡" },
  { key: "Ejercicios", titleKey: "exercises", icon: "dumbbell", emoji: "🏋️" },
  { key: "Nutrición", titleKey: "nutrition", icon: "salad", emoji: "🥗" },
  { key: "PlanesDeComida", titleKey: "mealPlans", icon: "clipboard", emoji: "📋" },
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
    await openContent({ url: item.url, provider: detectProvider(item.url).toString(), title: item.title }, t);
  };

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
  if (items.length === 0) return null;

  return (
    <div ref={sectionRef} className="space-y-4">
      {/* Section header with emoji — old money */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{section.emoji}</span>
          <h2
            className={cn(
              "font-bold tracking-tight text-foreground",
              device.isMobile ? "text-lg" : "text-xl"
            )}
          >
            {t(`explore.sections.${section.titleKey}.title`)}
          </h2>
        </div>
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
        <div className={cn("flex pb-4", device.isMobile ? "gap-3" : "gap-4")}>
          {items.map((item, idx) => {
            const provider = detectProvider(item.url);
            const gradient = gradients[idx % gradients.length];
            return (
              <div
                key={item.id}
                className={cn(
                  "group flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer",
                  "bg-card border border-border/30",
                  "transition-all duration-300 hover:border-border/60 hover:shadow-lg",
                  device.isMobile ? "w-[180px]" : device.isTablet ? "w-[220px]" : "w-[260px]"
                )}
                onClick={() => handleClick(item)}
              >
                {/* Colored gradient with centered icon */}
                <div
                  className={cn(
                    "relative flex items-center justify-center",
                    `bg-gradient-to-br ${gradient}`,
                    device.isMobile ? "h-[120px]" : "h-[140px]"
                  )}
                >
                  <IconComponent className="h-10 w-10 text-foreground/40" strokeWidth={1.5} />
                  {/* Duration pill */}
                  {item.duration_min && (
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-medium tracking-wide text-muted-foreground bg-card/70 backdrop-blur-sm rounded-full px-2 py-0.5">
                      {item.duration_min} min
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div className="p-3 space-y-1.5">
                  <h3
                    className={cn(
                      "font-semibold text-foreground leading-snug line-clamp-2 whitespace-normal",
                      device.isMobile ? "text-[13px]" : "text-sm"
                    )}
                  >
                    {item.title}
                  </h3>

                  {/* Provider badge + duration */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium tracking-wide bg-foreground/10 text-foreground/70 rounded px-1.5 py-0.5">
                      {t(PROVIDER_LABEL_KEYS[provider])}
                    </span>
                    {item.duration_min && (
                      <span className="text-[11px] text-muted-foreground">
                        {item.duration_min} min
                      </span>
                    )}
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center justify-between pt-0.5">
                    <button
                      className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClick(item);
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

                  {/* Coming soon note */}
                  <p className="text-[10px] text-muted-foreground/50 pt-0.5">
                    {t("explore.integrationComingSoon")}
                  </p>
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
