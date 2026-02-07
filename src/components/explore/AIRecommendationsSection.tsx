import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useRecommendations,
  useRefreshRecommendations,
  type RecommendationGoal,
  type Recommendation,
} from "@/hooks/use-recommendations";
import {
  useHealthyVerifiedMode,
  useToggleHealthyVerified,
} from "@/hooks/use-media-connections";
import {
  useRecommendationFeedback,
  useMarkSeen,
  type FeedbackAction,
} from "@/hooks/use-recommendation-feedback";
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
  Flame,
  Clock,
  ThumbsUp,
  Bookmark,
  EyeOff,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const GOALS: {
  value: RecommendationGoal;
  labelKey: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { value: "auto", labelKey: "recommendations.goals.auto", icon: <Sparkles className="h-3.5 w-3.5" />, color: "bg-primary/10 text-primary" },
  { value: "focus", labelKey: "recommendations.goals.focus", icon: <Brain className="h-3.5 w-3.5" />, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { value: "energy", labelKey: "recommendations.goals.energy", icon: <Zap className="h-3.5 w-3.5" />, color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  { value: "calm", labelKey: "recommendations.goals.calm", icon: <Wind className="h-3.5 w-3.5" />, color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  { value: "recovery", labelKey: "recommendations.goals.recovery", icon: <Heart className="h-3.5 w-3.5" />, color: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
  { value: "sleep", labelKey: "recommendations.goals.sleep", icon: <Moon className="h-3.5 w-3.5" />, color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  playlist: <Music className="h-4 w-4" />,
  podcast: <Podcast className="h-4 w-4" />,
  ambient: <Wind className="h-4 w-4" />,
  guided: <Heart className="h-4 w-4" />,
};

function RecommendationActionCard({
  recommendation,
  index,
}: {
  recommendation: Recommendation;
  index: number;
}) {
  const { t } = useTranslation();
  const feedbackMutation = useRecommendationFeedback();
  const markSeenMutation = useMarkSeen();
  const [actionTaken, setActionTaken] = useState<FeedbackAction | null>(null);

  const itemId = `${recommendation.type}-${recommendation.title.toLowerCase().replace(/\s+/g, "-")}`;

  const handleFeedback = (action: FeedbackAction) => {
    setActionTaken(action);
    feedbackMutation.mutate({ itemId, action });
    markSeenMutation.mutate({ itemId });

    if (action === "like") toast.success(t("mediaConnections.liked"));
    else if (action === "save") toast.success(t("mediaConnections.saved"));
    else if (action === "not_interested") toast(t("mediaConnections.hidden"));
  };

  if (actionTaken === "not_interested") return null;

  return (
    <Card className="border-border/50 hover:border-border/80 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted flex-shrink-0 mt-0.5">
            {TYPE_ICONS[recommendation.type] || <Music className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium truncate">{recommendation.title}</h4>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 flex-shrink-0">
                <Clock className="h-2.5 w-2.5" />
                {recommendation.duration}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {recommendation.description}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              <Badge variant="secondary" className="text-[10px] capitalize">
                {recommendation.type}
              </Badge>
              {recommendation.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={actionTaken === "like" ? "default" : "ghost"}
                className="h-7 px-2 text-xs gap-1"
                onClick={() => handleFeedback("like")}
                disabled={!!actionTaken}
              >
                <ThumbsUp className="h-3 w-3" />
                {t("mediaConnections.like")}
              </Button>
              <Button
                size="sm"
                variant={actionTaken === "save" ? "default" : "ghost"}
                className="h-7 px-2 text-xs gap-1"
                onClick={() => handleFeedback("save")}
                disabled={!!actionTaken}
              >
                <Bookmark className="h-3 w-3" />
                {t("mediaConnections.save")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs gap-1 text-muted-foreground"
                onClick={() => handleFeedback("not_interested")}
                disabled={!!actionTaken}
              >
                <EyeOff className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AIRecommendationsSection() {
  const { t } = useTranslation();
  const device = useDevice();
  const navigate = useNavigate();
  const [selectedGoal, setSelectedGoal] = useState<RecommendationGoal>("auto");

  const { data, isLoading, error } = useRecommendations(selectedGoal);
  const refreshMutation = useRefreshRecommendations();
  const { data: healthyVerified = true } = useHealthyVerifiedMode();
  const toggleHealthyVerified = useToggleHealthyVerified();

  const handleRefresh = () => {
    refreshMutation.mutate(selectedGoal, {
      onSuccess: () => toast.success(t("recommendations.refreshed")),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">
            {t("mediaConnections.aiRecommendations")}
          </h2>
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1"
            onClick={() => navigate("/recommendations")}
          >
            {t("common.viewAll")}
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Healthy Verified Toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <div>
            <Label className="text-xs font-medium">
              {t("mediaConnections.healthyVerified")}
            </Label>
            <p className="text-[10px] text-muted-foreground">
              {t("mediaConnections.healthyVerifiedDesc")}
            </p>
          </div>
        </div>
        <Switch
          checked={healthyVerified}
          onCheckedChange={(checked) => toggleHealthyVerified.mutate(checked)}
          disabled={toggleHealthyVerified.isPending}
        />
      </div>

      {/* Goal Selector */}
      <div className="flex flex-wrap gap-1.5">
        {GOALS.map((goal) => (
          <Button
            key={goal.value}
            variant={selectedGoal === goal.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedGoal(goal.value)}
            className={cn(
              "gap-1 rounded-full text-xs h-7 px-2.5",
              selectedGoal === goal.value ? "" : goal.color
            )}
          >
            {goal.icon}
            {t(goal.labelKey)}
          </Button>
        ))}
      </div>

      {/* Recommendations List */}
      <div className="space-y-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : error ? (
          <Card className="border-destructive/30">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-destructive mb-3">{error.message}</p>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                {t("common.retry")}
              </Button>
            </CardContent>
          </Card>
        ) : data?.recommendations?.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-6 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("recommendations.empty")}</p>
            </CardContent>
          </Card>
        ) : (
          data?.recommendations?.slice(0, 5).map((rec, index) => (
            <RecommendationActionCard
              key={index}
              recommendation={rec}
              index={index}
            />
          ))
        )}
      </div>
    </div>
  );
}
