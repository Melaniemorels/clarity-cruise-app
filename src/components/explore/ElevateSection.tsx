import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDevice, useResponsiveFontSize } from "@/hooks/use-device";
import {
  Hexagon,
  Clock,
  CalendarPlus,
  Target,
  Brain,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

/* ── Micro Insights ── */
interface MicroInsight {
  id: string;
  titleKey: string;
  durationMin: number;
  category: "energy" | "planning" | "focus" | "discipline" | "travel";
}

const MICRO_INSIGHTS: MicroInsight[] = [
  { id: "energy-time", titleKey: "elevate.insights.energyTime", durationMin: 5, category: "energy" },
  { id: "80-20", titleKey: "elevate.insights.weeklyPlanning", durationMin: 6, category: "planning" },
  { id: "deep-work", titleKey: "elevate.insights.deepWork", durationMin: 4, category: "focus" },
  { id: "digital-discipline", titleKey: "elevate.insights.digitalDiscipline", durationMin: 3, category: "discipline" },
  { id: "ideal-day", titleKey: "elevate.insights.idealDay", durationMin: 7, category: "planning" },
  { id: "focus-travel", titleKey: "elevate.insights.focusTravel", durationMin: 5, category: "travel" },
];

const CATEGORY_GRADIENTS: Record<string, string> = {
  energy: "from-amber-500/20 to-orange-500/20",
  planning: "from-blue-500/20 to-indigo-500/20",
  focus: "from-violet-500/20 to-purple-500/20",
  discipline: "from-emerald-500/20 to-teal-500/20",
  travel: "from-cyan-500/20 to-sky-500/20",
};

/* ── Weekly Challenge ── */
interface WeeklyChallenge {
  titleKey: string;
  descriptionKey: string;
  durationDays: number;
}

const CURRENT_CHALLENGE: WeeklyChallenge = {
  titleKey: "elevate.challenge.singleTasking",
  descriptionKey: "elevate.challenge.singleTaskingDesc",
  durationDays: 7,
};

/* ── Insight Action Sheet ── */
function InsightActions({
  onClose,
  onApply,
  onSchedule,
  onFocus,
}: {
  onClose: () => void;
  onApply: () => void;
  onSchedule: () => void;
  onFocus: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 mt-3">
      <Button variant="outline" size="sm" className="justify-start gap-2" onClick={onApply}>
        <Target className="h-3.5 w-3.5" />
        {t("elevate.actions.applyToWeek")}
      </Button>
      <Button variant="outline" size="sm" className="justify-start gap-2" onClick={onSchedule}>
        <CalendarPlus className="h-3.5 w-3.5" />
        {t("elevate.actions.scheduleCalendar")}
      </Button>
      <Button variant="outline" size="sm" className="justify-start gap-2" onClick={onFocus}>
        <Brain className="h-3.5 w-3.5" />
        {t("elevate.actions.startFocusBlock")}
      </Button>
    </div>
  );
}

/* ── Main Component ── */
export function ElevateSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const device = useDevice();
  const fonts = useResponsiveFontSize();
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [challengeActive, setChallengeActive] = useState(false);
  const [challengeDay, setChallengeDay] = useState(0);

  const handleApplyToWeek = (insightId: string) => {
    toast(t("elevate.toast.applied"));
    setExpandedInsight(null);
  };

  const handleScheduleCalendar = () => {
    navigate("/calendar");
    setExpandedInsight(null);
  };

  const handleStartFocus = () => {
    navigate("/entries");
    setExpandedInsight(null);
  };

  const activateChallenge = () => {
    setChallengeActive(true);
    setChallengeDay(1);
    toast(t("elevate.toast.challengeStarted"));
  };

  return (
    <div className={cn("space-y-5", device.isTablet && "space-y-6")}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2
          className={cn(
            "font-semibold flex items-center gap-2 text-theme-textPrimary",
            fonts.heading3
          )}
        >
          <Hexagon className={cn("text-theme-textPrimary", device.isMobile ? "h-5 w-5" : "h-6 w-6")} strokeWidth={1.5} />
          {t("elevate.title")}
        </h2>
        <span className={cn("text-theme-textSecondary", device.isMobile ? "text-[10px]" : "text-xs")}>
          {t("elevate.subtitle")}
        </span>
      </div>

      {/* A) Micro Insights */}
      <div className={cn("space-y-3", device.isTablet && "space-y-4")}>
        <h3 className={cn("font-medium text-theme-textPrimary", fonts.small)}>
          {t("elevate.microInsights")}
        </h3>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className={cn("flex pb-4", device.isMobile ? "gap-3" : "gap-4")}>
            {MICRO_INSIGHTS.map((insight) => (
              <Card
                key={insight.id}
                className={cn(
                  "flex-shrink-0 overflow-hidden cursor-pointer transition-all hover:scale-[1.02] bg-theme-cardBg",
                  device.isMobile ? "w-44" : device.isTablet ? "w-52" : "w-60",
                  expandedInsight === insight.id && "ring-1 ring-primary/30"
                )}
                style={{ borderRadius: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                onClick={() =>
                  setExpandedInsight(expandedInsight === insight.id ? null : insight.id)
                }
              >
                <div
                  className={cn(
                    "bg-gradient-to-br flex items-center justify-center",
                    CATEGORY_GRADIENTS[insight.category] || "from-primary/20 to-primary/10",
                    device.isMobile ? "h-20" : "h-24"
                  )}
                >
                  <Brain className={cn("text-theme-textSecondary", device.isMobile ? "h-6 w-6" : "h-7 w-7")} strokeWidth={1.5} />
                </div>
                <CardContent className={cn("whitespace-normal", device.isMobile ? "p-3" : "p-4")}>
                  <h4 className={cn("font-medium mb-1 text-theme-textPrimary leading-tight", fonts.small)}>
                    {t(insight.titleKey)}
                  </h4>
                  <div className="flex items-center gap-1 mb-1">
                    <Clock className="h-3 w-3 text-theme-textSecondary" />
                    <span className={cn("text-theme-textSecondary", device.isMobile ? "text-[10px]" : "text-xs")}>
                      {insight.durationMin} min
                    </span>
                  </div>
                  {expandedInsight === insight.id && (
                    <InsightActions
                      onClose={() => setExpandedInsight(null)}
                      onApply={() => handleApplyToWeek(insight.id)}
                      onSchedule={handleScheduleCalendar}
                      onFocus={handleStartFocus}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* B) Weekly Challenge */}
      <div className="space-y-3">
        <h3 className={cn("font-medium text-theme-textPrimary", fonts.small)}>
          {t("elevate.weeklyChallenge")}
        </h3>
        <Card
          className="bg-theme-cardBg overflow-hidden"
          style={{ borderRadius: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <CardContent className={device.isMobile ? "p-4" : "p-5"}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className={cn("font-semibold text-theme-textPrimary mb-1", fonts.body)}>
                  {t(CURRENT_CHALLENGE.titleKey)}
                </h4>
                <p className={cn("text-theme-textSecondary leading-snug", device.isMobile ? "text-[11px]" : "text-xs")}>
                  {t(CURRENT_CHALLENGE.descriptionKey)}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] ml-2 flex-shrink-0">
                {CURRENT_CHALLENGE.durationDays} {t("elevate.days")}
              </Badge>
            </div>

            {challengeActive ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn("text-theme-textSecondary", device.isMobile ? "text-[10px]" : "text-xs")}>
                    {t("elevate.day")} {challengeDay} / {CURRENT_CHALLENGE.durationDays}
                  </span>
                  <span className={cn("text-theme-textSecondary", device.isMobile ? "text-[10px]" : "text-xs")}>
                    {Math.round((challengeDay / CURRENT_CHALLENGE.durationDays) * 100)}%
                  </span>
                </div>
                <Progress value={(challengeDay / CURRENT_CHALLENGE.durationDays) * 100} className="h-1.5" />
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-1 gap-2"
                onClick={activateChallenge}
              >
                <Target className="h-3.5 w-3.5" />
                {t("elevate.startChallenge")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* C) AI Recommendations (Elevate-specific) */}
      <div className="space-y-3">
        <h3 className={cn("font-medium text-theme-textPrimary", fonts.small)}>
          {t("elevate.aiRecommendations")}
        </h3>
        <Card
          className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10"
          style={{ borderRadius: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <CardContent className={device.isMobile ? "p-4" : "p-5"}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10 flex-shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className={cn("text-theme-textPrimary leading-snug mb-3", fonts.small)}>
                  {t("elevate.aiSuggestion")}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleStartFocus}>
                    <Brain className="h-3 w-3" />
                    {t("elevate.actions.startFocusBlock")}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs text-theme-textSecondary">
                    {t("elevate.dismiss")}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
