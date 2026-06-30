import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useDevice, useResponsiveFontSize } from "@/hooks/use-device";
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
  Clock,
  Bookmark,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

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

const TYPE_META: Record<string, { emoji: string; icon: React.ReactNode }> = {
  playlist: { emoji: "🎵", icon: <Music className="h-4 w-4" /> },
  podcast: { emoji: "🎙️", icon: <Podcast className="h-4 w-4" /> },
  ambient: { emoji: "🌿", icon: <Wind className="h-4 w-4" /> },
  guided: { emoji: "🧘", icon: <Heart className="h-4 w-4" /> },
};

const MOOD_GRADIENTS: Record<string, string> = {
  calm: "from-green-500/20 to-teal-500/20",
  energizing: "from-yellow-500/20 to-orange-500/20",
  focused: "from-blue-500/20 to-indigo-500/20",
  uplifting: "from-amber-500/20 to-rose-500/20",
  relaxing: "from-purple-500/20 to-violet-500/20",
};

function RecommendationCard({
  recommendation,
}: {
  recommendation: Recommendation;
}) {
  const device = useDevice();
  const fonts = useResponsiveFontSize();
  const meta = TYPE_META[recommendation.type] || TYPE_META.playlist;
  const gradient = MOOD_GRADIENTS[recommendation.mood] || "from-primary/20 to-primary/10";

  const { t } = useTranslation();
  const externalLink = recommendation.externalUrl || recommendation.spotifyUri;
  const provider = externalLink ? detectProvider(externalLink) : 'other';
  const showComingSoon = externalLink ? COMING_SOON_PROVIDERS.includes(provider) : false;

  const handleClick = async () => {
    await openContent({ url: externalLink, provider: provider, title: recommendation.title }, t);
  };

  return (
    <Card
      className={cn(
        "flex-shrink-0 overflow-hidden cursor-pointer transition-all hover:scale-[1.02] bg-theme-cardBg",
        device.isMobile ? "w-40" : device.isTablet ? "w-48" : "w-56"
      )}
      style={{
        borderRadius: "18px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
      onClick={handleClick}
    >
      <div
        className={cn(
          "bg-gradient-to-br flex items-center justify-center relative",
          gradient,
          device.isMobile ? "h-28" : device.isTablet ? "h-32" : "h-36"
        )}
      >
        <div className={device.isMobile ? "text-3xl" : "text-4xl"}>
          {meta.emoji}
        </div>
        <div className="absolute bottom-2 right-2">
          <Badge
            variant="secondary"
            className="text-[9px] px-1.5 py-0.5 bg-background/80 backdrop-blur-sm"
          >
            <Clock className="h-2.5 w-2.5 mr-0.5" />
            {recommendation.duration}
          </Badge>
        </div>
      </div>
      <CardContent className={device.isMobile ? "p-3" : "p-4"}>
        <h3
          className={cn(
            "font-medium mb-0.5 truncate text-theme-textPrimary",
            fonts.small
          )}
        >
          {recommendation.title}
        </h3>
        <p className="text-[10px] text-theme-textSecondary line-clamp-2 mb-1.5 whitespace-normal">
          {recommendation.description}
        </p>
        <div className="flex items-center gap-1 mb-1.5">
          <Badge variant="outline" className="text-[9px] capitalize px-1.5 py-0 font-normal">
            {t(PROVIDER_LABEL_KEYS[provider])}
          </Badge>
          <Badge variant="outline" className="text-[9px] capitalize px-1.5 py-0 font-normal">
            {t(`recommendations.types.${recommendation.type}`, recommendation.type)}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 gap-1 text-[10px] text-theme-textSecondary hover:text-theme-textPrimary"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            <ExternalLink className="h-3 w-3" />
            {t('explore.open')}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
            }}
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
}

export function AIRecommendationsSection() {
  const { t } = useTranslation();
  const device = useDevice();
  const fonts = useResponsiveFontSize();
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
      {/* Section header — same style as categories */}
      <div className="flex items-center justify-between">
        <h2
          className={cn(
            "font-semibold flex items-center gap-2 text-theme-textPrimary",
            fonts.heading3
          )}
        >
          <span className={device.isMobile ? "text-xl" : "text-2xl"}>✨</span>
          {t("mediaConnections.aiRecommendations")}
        </h2>
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

      {/* Cards row — horizontal scroll matching category style */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className={cn("flex pb-4", device.isMobile ? "gap-3" : "gap-4")}>
          {isLoading
            ? [...Array(3)].map((_, i) => (
                <Card
                  key={i}
                  className={cn(
                    "flex-shrink-0 overflow-hidden bg-theme-cardBg",
                    device.isMobile ? "w-40" : device.isTablet ? "w-48" : "w-56"
                  )}
                  style={{ borderRadius: "18px" }}
                >
                  <Skeleton
                    className={cn(
                      "w-full",
                      device.isMobile ? "h-28" : device.isTablet ? "h-32" : "h-36"
                    )}
                  />
                  <CardContent className={device.isMobile ? "p-3" : "p-4"}>
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))
            : error
              ? (
                <Card
                  className="flex-shrink-0 border-destructive/30 min-w-[200px]"
                  style={{ borderRadius: "18px" }}
                >
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
                  <Card
                    className="flex-shrink-0 min-w-[200px]"
                    style={{ borderRadius: "18px" }}
                  >
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
