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
  subtitleKey: string;
  icon: string;
  emoji: string;
}

// Gradient palettes per section
const SECTION_GRADIENTS: Record<string, string[]> = {
  music: [
    "from-purple-900/60 to-pink-900/40",
    "from-emerald-900/50 to-teal-900/40",
    "from-indigo-900/50 to-purple-900/40",
  ],
  audiobooks: [
    "from-amber-900/50 to-yellow-900/40",
    "from-teal-900/50 to-emerald-900/40",
    "from-cyan-900/50 to-teal-900/40",
  ],
  yoga: [
    "from-teal-900/50 to-emerald-900/40",
    "from-purple-900/50 to-indigo-900/40",
    "from-amber-900/50 to-orange-900/40",
  ],
  pilates: [
    "from-rose-900/50 to-pink-900/40",
    "from-sky-900/50 to-blue-900/40",
    "from-violet-900/50 to-purple-900/40",
  ],
  meditation: [
    "from-indigo-900/50 to-blue-900/40",
    "from-teal-900/50 to-cyan-900/40",
    "from-purple-900/50 to-violet-900/40",
  ],
  calm: [
    "from-sky-900/50 to-blue-900/40",
    "from-emerald-900/50 to-teal-900/40",
    "from-indigo-900/50 to-purple-900/40",
  ],
  energy: [
    "from-orange-900/50 to-amber-900/40",
    "from-red-900/50 to-rose-900/40",
    "from-yellow-900/50 to-amber-900/40",
  ],
  exercises: [
    "from-sky-900/50 to-indigo-900/40",
    "from-emerald-900/50 to-teal-900/40",
    "from-amber-900/50 to-orange-900/40",
  ],
  podcasts: [
    "from-violet-900/50 to-purple-900/40",
    "from-rose-900/50 to-pink-900/40",
    "from-slate-800/50 to-zinc-900/40",
  ],
  nutrition: [
    "from-green-900/50 to-emerald-900/40",
    "from-amber-900/50 to-yellow-900/40",
    "from-rose-900/40 to-purple-900/40",
  ],
  mealPlans: [
    "from-teal-900/50 to-green-900/40",
    "from-amber-900/50 to-orange-900/40",
    "from-indigo-900/50 to-violet-900/40",
  ],
};

const SECTION_ICONS: Record<string, React.ElementType> = {
  music: Music,
  audiobooks: Headphones,
  yoga: Dumbbell,
  pilates: Dumbbell,
  meditation: Brain,
  calm: Wind,
  energy: Flame,
  exercises: Dumbbell,
  podcasts: Headphones,
  nutrition: Salad,
  mealPlans: ClipboardList,
};

export const EXPLORE_SECTIONS: SectionConfig[] = [
  { key: "music", titleKey: "explore.sections.music.title", subtitleKey: "explore.sections.music.subtitle", icon: "music", emoji: "🎵" },
  { key: "audiobooks", titleKey: "explore.sections.audiobooks.title", subtitleKey: "explore.sections.audiobooks.subtitle", icon: "headphones", emoji: "🎧" },
  { key: "podcasts", titleKey: "explore.sections.podcasts.title", subtitleKey: "explore.sections.podcasts.subtitle", icon: "headphones", emoji: "🎙️" },
  { key: "yoga", titleKey: "explore.sections.yoga.title", subtitleKey: "explore.sections.yoga.subtitle", icon: "dumbbell", emoji: "🧘" },
  { key: "pilates", titleKey: "explore.sections.pilates.title", subtitleKey: "explore.sections.pilates.subtitle", icon: "dumbbell", emoji: "💪" },
  { key: "meditation", titleKey: "explore.sections.meditation.title", subtitleKey: "explore.sections.meditation.subtitle", icon: "brain", emoji: "🧠" },
  { key: "calm", titleKey: "explore.sections.calm.title", subtitleKey: "explore.sections.calm.subtitle", icon: "wind", emoji: "🌿" },
  { key: "energy", titleKey: "explore.sections.energy.title", subtitleKey: "explore.sections.energy.subtitle", icon: "flame", emoji: "⚡" },
  { key: "exercises", titleKey: "explore.sections.exercises.title", subtitleKey: "explore.sections.exercises.subtitle", icon: "dumbbell", emoji: "🏋️" },
  { key: "nutrition", titleKey: "explore.sections.nutrition.title", subtitleKey: "explore.sections.nutrition.subtitle", icon: "salad", emoji: "🥗" },
  { key: "mealPlans", titleKey: "explore.sections.mealPlans.title", subtitleKey: "explore.sections.mealPlans.subtitle", icon: "clipboard", emoji: "📋" },
];

// Map from old DB category names (Spanish) to new section keys for backward compatibility
const CATEGORY_KEY_MAP: Record<string, string> = {
  "Música": "music",
  "Audiolibros": "audiobooks",
  "Podcasts": "podcasts",
  "Yoga": "yoga",
  "Pilates": "pilates",
  "Meditación": "meditation",
  "Calma": "calm",
  "Energía": "energy",
  "Ejercicios": "exercises",
  "Nutrición": "nutrition",
  "PlanesDeComida": "mealPlans",
  "MealPreps": "mealPlans",
};

/** Resolve a category (which may be a Spanish DB name or an English key) to the stable section key */
export function resolveSectionKey(category: string): string {
  return CATEGORY_KEY_MAP[category] ?? category;
}

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
      {/* Section header with emoji */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{section.emoji}</span>
          <h2
            className={cn(
              "font-bold tracking-tight text-foreground",
              device.isMobile ? "text-lg" : "text-xl"
            )}
          >
            {t(section.titleKey)}
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
