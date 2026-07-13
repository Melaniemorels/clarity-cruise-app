import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { detectProvider, COMING_SOON_PROVIDERS, PROVIDER_LABEL_KEYS } from "@/lib/external-link";
import { openContent } from "@/lib/open-content";
import {
  useRecommendations,
  useRefreshRecommendations,
  type RecommendationGoal,
  type Recommendation,
} from "@/hooks/use-recommendations";
import { cn } from "@/lib/utils";
import { useDevice } from "@/hooks/use-device";
import {
  Sparkles,
  RefreshCw,
  Music,
  Podcast,
  Wind,
  Heart,
  Zap,
  Moon,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import { ExplorerContentCard, type ExplorerCardIcon } from "./ExplorerContentCard";
import { explorerText, sectionTitleSize } from "./explorer-tokens";
import { useExplorerCardActions, urlRef } from "./use-explorer-card-actions";

const GOALS: {
  value: RecommendationGoal;
  labelKey: string;
  icon: React.ReactNode;
}[] = [
  { value: "auto", labelKey: "recommendations.goals.auto", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { value: "focus", labelKey: "recommendations.goals.focus", icon: <Brain className="h-3.5 w-3.5" /> },
  { value: "energy", labelKey: "recommendations.goals.energy", icon: <Zap className="h-3.5 w-3.5" /> },
  { value: "calm", labelKey: "recommendations.goals.calm", icon: <Wind className="h-3.5 w-3.5" /> },
  { value: "recovery", labelKey: "recommendations.goals.recovery", icon: <Heart className="h-3.5 w-3.5" /> },
  { value: "sleep", labelKey: "recommendations.goals.sleep", icon: <Moon className="h-3.5 w-3.5" /> },
];

const TYPE_ICONS: Record<string, ExplorerCardIcon> = {
  playlist: Music,
  podcast: Podcast,
  ambient: Wind,
  guided: Heart,
};

const MOOD_GRADIENTS: Record<string, string> = {
  calm: "from-green-900/50 to-teal-900/40",
  energizing: "from-orange-900/50 to-amber-900/40",
  focused: "from-blue-900/50 to-indigo-900/40",
  uplifting: "from-amber-900/50 to-rose-900/40",
  relaxing: "from-purple-900/50 to-violet-900/40",
};

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const { t } = useTranslation();
  const { buildMenu, recordOpen } = useExplorerCardActions();

  const gradient = MOOD_GRADIENTS[recommendation.mood] ?? "from-muted/80 to-secondary/60";
  const Icon = TYPE_ICONS[recommendation.type] ?? Music;
  const externalLink = recommendation.externalUrl || recommendation.spotifyUri;
  const provider = externalLink ? detectProvider(externalLink) : "other";
  const showComingSoon = externalLink ? COMING_SOON_PROVIDERS.includes(provider) : false;

  const itemRef = externalLink
    ? urlRef({
        url: externalLink,
        provider: provider.toString(),
        title: recommendation.title,
        description: recommendation.description,
      })
    : null;

  const handleClick = async () => {
    if (itemRef) recordOpen(itemRef);
    await openContent({ url: externalLink, provider, title: recommendation.title }, t);
  };

  return (
    <ExplorerContentCard
      title={recommendation.title}
      description={recommendation.description}
      providerLabelKey={PROVIDER_LABEL_KEYS[provider]}
      durationLabel={recommendation.duration}
      categoryLabelKey={`recommendations.types.${recommendation.type}`}
      gradient={gradient}
      icon={Icon}
      comingSoon={showComingSoon}
      layout="carousel"
      onOpen={handleClick}
      menu={itemRef ? buildMenu(itemRef) : undefined}
    />
  );
}

export function AIRecommendationsSection() {
  const { t } = useTranslation();
  const device = useDevice();
  const [selectedGoal, setSelectedGoal] = useState<RecommendationGoal>("auto");

  const { data, isLoading, error } = useRecommendations(selectedGoal);
  const refreshMutation = useRefreshRecommendations();

  const handleRefresh = () => {
    refreshMutation.mutate(selectedGoal, {
      onSuccess: () => toast.success(t("recommendations.refreshed")),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className={cn("space-y-3", device.isTablet && "space-y-4")}>
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <h2 className={cn(explorerText.sectionTitle, sectionTitleSize(device.isMobile))}>
            {t("mediaConnections.aiRecommendations")}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleRefresh}
          disabled={refreshMutation.isPending || isLoading}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4",
              (refreshMutation.isPending || isLoading) && "animate-spin"
            )}
          />
        </Button>
      </div>

      {/* Goal filter pills */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-1.5 pb-1">
          {GOALS.map((goal) => (
            <Button
              key={goal.value}
              variant={selectedGoal === goal.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedGoal(goal.value)}
              className="gap-1 rounded-full text-xs h-7 px-2.5 flex-shrink-0"
            >
              {goal.icon}
              {t(goal.labelKey)}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Cards row */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className={cn("flex items-stretch pb-4", device.isMobile ? "gap-3" : "gap-4")}>
          {isLoading
            ? [...Array(3)].map((_, i) => (
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
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            : error
              ? (
                <Card className="flex-shrink-0 rounded-2xl border-destructive/30 min-w-[200px]">
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-destructive mb-3">{error.message}</p>
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                      {t("common.retry")}
                    </Button>
                  </CardContent>
                </Card>
              )
              : data?.recommendations?.length === 0
                ? (
                  <Card className="flex-shrink-0 rounded-2xl min-w-[200px]">
                    <CardContent className="py-8 text-center">
                      <Sparkles className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {t("recommendations.empty")}
                      </p>
                    </CardContent>
                  </Card>
                )
                : data?.recommendations?.map((rec, index) => (
                    <RecommendationCard key={index} recommendation={rec} />
                  ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
