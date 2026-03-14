import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveNav, useNavStyle } from "@/components/ResponsiveNav";
import { AdaptiveHeading } from "@/components/AdaptiveLayout";
import { useDevice } from "@/hooks/use-device";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  useRecommendations, 
  useRefreshRecommendations, 
  useMediaConsent,
  useUpdateMediaConsent,
  type RecommendationGoal,
  type Recommendation,
  type MediaConsent
} from "@/hooks/use-recommendations";
import { cn } from "@/lib/utils";
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
  Flame,
  Coffee,
  Settings2,
  Shield,
  Clock
} from "lucide-react";
import { toast } from "sonner";

const GOAL_DEFS: { value: RecommendationGoal; icon: React.ReactNode; color: string }[] = [
  { value: "auto", icon: <Sparkles className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
  { value: "focus", icon: <Brain className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-500" },
  { value: "energy", icon: <Zap className="h-4 w-4" />, color: "bg-yellow-500/10 text-yellow-500" },
  { value: "calm", icon: <Wind className="h-4 w-4" />, color: "bg-green-500/10 text-green-500" },
  { value: "recovery", icon: <Heart className="h-4 w-4" />, color: "bg-pink-500/10 text-pink-500" },
  { value: "motivation", icon: <Flame className="h-4 w-4" />, color: "bg-orange-500/10 text-orange-500" },
  { value: "sleep", icon: <Moon className="h-4 w-4" />, color: "bg-indigo-500/10 text-indigo-500" },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  playlist: <Music className="h-5 w-5" />,
  podcast: <Podcast className="h-5 w-5" />,
  ambient: <Wind className="h-5 w-5" />,
  guided: <Heart className="h-5 w-5" />,
};

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <Card className="border-border/50 hover:border-border transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              {TYPE_ICONS[recommendation.type] || <Music className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-base font-medium">{recommendation.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs capitalize">
                  {recommendation.type}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {recommendation.duration}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-sm mb-3">
          {recommendation.description}
        </CardDescription>
        <div className="flex flex-wrap gap-1.5">
          {recommendation.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ConsentSettings() {
  const { t } = useTranslation();
  const { data: consent, isLoading } = useMediaConsent();
  const updateConsent = useUpdateMediaConsent();

  const handleToggle = (key: "share_media_preferences" | "share_health_data" | "share_calendar_patterns", value: boolean) => {
    updateConsent.mutate({ [key]: value }, {
      onError: () => toast.error(t("errors.generic")),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t("recommendations.dataControls")}</CardTitle>
        </div>
        <CardDescription className="text-sm">
          {t("recommendations.dataControlsDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="health-data" className="text-sm font-medium">
              {t("recommendations.healthData")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("recommendations.healthDataDescription")}
            </p>
          </div>
          <Switch
            id="health-data"
            checked={consent?.share_health_data || false}
            onCheckedChange={(checked) => handleToggle("share_health_data", checked)}
            disabled={updateConsent.isPending}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="calendar-data" className="text-sm font-medium">
              {t("recommendations.calendarData")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("recommendations.calendarDataDescription")}
            </p>
          </div>
          <Switch
            id="calendar-data"
            checked={consent?.share_calendar_patterns || false}
            onCheckedChange={(checked) => handleToggle("share_calendar_patterns", checked)}
            disabled={updateConsent.isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="media-data" className="text-sm font-medium">
              {t("recommendations.mediaPreferences")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("recommendations.mediaPreferencesDescription")}
            </p>
          </div>
          <Switch
            id="media-data"
            checked={consent?.share_media_preferences || false}
            onCheckedChange={(checked) => handleToggle("share_media_preferences", checked)}
            disabled={updateConsent.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Recommendations() {
  const { t } = useTranslation();
  const device = useDevice();
  const navStyle = useNavStyle();
  const [selectedGoal, setSelectedGoal] = useState<RecommendationGoal>("auto");
  const [showSettings, setShowSettings] = useState(false);

  const { data, isLoading, error } = useRecommendations(selectedGoal);
  const refreshMutation = useRefreshRecommendations();

  const handleRefresh = () => {
    refreshMutation.mutate(selectedGoal, {
      onSuccess: () => toast.success(t("recommendations.refreshed")),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className={cn("min-h-screen bg-theme-bg transition-all duration-300", navPadding)}>
      <div className={cn(
        "mx-auto transition-all duration-300",
        device.isDesktop ? "max-w-3xl" : device.isTablet ? "max-w-2xl" : "max-w-full"
      )}>
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur bg-theme-bgElevated/80 border-b border-theme-borderSubtle">
          <div className={cn(
            "flex items-center justify-between transition-all",
            device.isMobile ? "p-4" : "p-5"
          )}>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <AdaptiveHeading level={1}>{t("recommendations.title")}</AdaptiveHeading>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings2 className="h-5 w-5" strokeWidth={1.4} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshMutation.isPending || isLoading}
              >
                <RefreshCw className={cn("h-5 w-5", (refreshMutation.isPending || isLoading) && "animate-spin")} strokeWidth={1.4} />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Goal Selector */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">{t("recommendations.selectGoal")}</p>
            <div className="flex flex-wrap gap-2">
              {GOAL_DEFS.map((goal) => (
                <Button
                  key={goal.value}
                  variant={selectedGoal === goal.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedGoal(goal.value)}
                  className={cn(
                    "gap-1.5 rounded-full",
                    selectedGoal === goal.value ? "" : goal.color
                  )}
                >
                  {goal.icon}
                  {t(`recommendations.goals.${goal.value}`)}
                </Button>
              ))}
            </div>
          </div>

          {/* Context Info */}
          {data && !isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Coffee className="h-3.5 w-3.5" />
              <span>
                {t("recommendations.contextDetected")}: <span className="capitalize">{data.context}</span>
              </span>
              {data.cached && (
                <Badge variant="secondary" className="text-xs ml-auto">
                  {t("recommendations.cached")}
                </Badge>
              )}
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && <ConsentSettings />}

          {/* Recommendations */}
          <div className="space-y-4">
            {isLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : error ? (
              <Card className="border-destructive/50">
                <CardContent className="py-8 text-center">
                  <p className="text-destructive mb-4">{error.message}</p>
                  <Button variant="outline" onClick={handleRefresh}>
                    {t("common.retry")}
                  </Button>
                </CardContent>
              </Card>
            ) : data?.recommendations?.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="py-8 text-center">
                  <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("recommendations.empty")}</p>
                </CardContent>
              </Card>
            ) : (
              data?.recommendations?.map((rec, index) => (
                <RecommendationCard key={index} recommendation={rec} />
              ))
            )}
          </div>

          {/* Privacy Notice */}
          <p className="text-xs text-center text-muted-foreground px-4">
            {t("recommendations.privacyNotice")}
          </p>
        </div>
      </div>

      <ResponsiveNav />
    </div>
  );
}