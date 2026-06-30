import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  RefreshCw, 
  Sunrise, 
  Sun, 
  CloudSun, 
  Moon,
  ChevronDown, 
  ChevronUp,
  Briefcase,
  Dumbbell,
  Utensils,
  BedDouble,
  Brain,
  Settings2,
  Plane
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { usePerfectDay, TimeBlock, Activity, Period, ActivityType, EnergyLevel } from "@/hooks/use-perfect-day";
import { useProfile } from "@/hooks/use-profile";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ChangeRoutineModal } from "@/components/ChangeRoutineModal";

const periodIcons: Record<Period, React.ReactNode> = {
  morning: <Sunrise className="h-4 w-4" />,
  midday: <Sun className="h-4 w-4" />,
  afternoon: <CloudSun className="h-4 w-4" />,
  evening: <Moon className="h-4 w-4" />,
};

const activityTypeIcons: Record<ActivityType, React.ReactNode> = {
  work: <Briefcase className="h-4 w-4" />,
  movement: <Dumbbell className="h-4 w-4" />,
  nutrition: <Utensils className="h-4 w-4" />,
  rest: <BedDouble className="h-4 w-4" />,
  mindfulness: <Brain className="h-4 w-4" />,
};

const periodColors: Record<Period, string> = {
  morning: "border-amber-500/20 bg-amber-500/5",
  midday: "border-yellow-500/20 bg-yellow-500/5",
  afternoon: "border-blue-500/20 bg-blue-500/5",
  evening: "border-indigo-500/20 bg-indigo-500/5",
};

const activityTypeColors: Record<ActivityType, string> = {
  work: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  movement: "bg-green-500/10 text-green-700 dark:text-green-400",
  nutrition: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  rest: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  mindfulness: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
};

function TimeBlockCard({ block, index }: { block: TimeBlock; index: number }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const hasActivities = block.activities.length > 0;

  const periodLabels: Record<Period, string> = {
    morning: t("perfectDay.periods.morning"),
    midday: t("perfectDay.periods.midday"),
    afternoon: t("perfectDay.periods.afternoon"),
    evening: t("perfectDay.periods.evening"),
  };

  const activityCountText = hasActivities
    ? `${block.activities.length} ${t("perfectDay.activities")}`
    : t("perfectDay.noActivities");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={`overflow-hidden border ${periodColors[block.period]}`}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => hasActivities && setIsExpanded(!isExpanded)}
          onKeyDown={(e) => e.key === "Enter" && hasActivities && setIsExpanded(!isExpanded)}
          className={`w-full p-4 flex items-center justify-between text-left ${hasActivities ? "cursor-pointer" : "cursor-default"}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border">
              {periodIcons[block.period]}
            </div>
            <div>
              <h3 className="font-semibold text-base">{periodLabels[block.period]}</h3>
              <p className="text-xs text-muted-foreground">
                {activityCountText}
              </p>
            </div>
          </div>
          {hasActivities && (
            isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )
          )}
        </div>

        <AnimatePresence>
          {isExpanded && hasActivities && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="pt-0 pb-4 space-y-2">
                {block.activities.map((activity, actIndex) => (
                  <ActivityItem key={actIndex} activity={activity} />
                ))}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const { t } = useTranslation();
  
  const activityLabels: Record<ActivityType, string> = {
    work: t("perfectDay.activityTypes.work"),
    movement: t("perfectDay.activityTypes.movement"),
    nutrition: t("perfectDay.activityTypes.nutrition"),
    rest: t("perfectDay.activityTypes.rest"),
    mindfulness: t("perfectDay.activityTypes.mindfulness"),
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/80 border">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activityTypeColors[activity.type]}`}>
        {activityTypeIcons[activity.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-medium text-sm">{activity.title}</h4>
          {activity.duration && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {activity.duration}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
      </div>
      <Badge variant="secondary" className="text-xs flex-shrink-0">
        {activityLabels[activity.type]}
      </Badge>
    </div>
  );
}

function ClosingCard({ closing }: { closing: { type: "reflection" | "affirmation"; text: string } }) {
  const { t } = useTranslation();
  const isReflection = closing.type === "reflection";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="border-2 border-primary/10 bg-primary/5">
        <CardContent className="p-6 text-center space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {isReflection ? t("perfectDay.closingReflection") : t("perfectDay.closingAffirmation")}
          </p>
          <p className="text-base font-medium italic text-foreground">"{closing.text}"</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="space-y-3 mt-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function EnergyBadge({ level, sleepHours }: { level: EnergyLevel; sleepHours: number }) {
  const { t } = useTranslation();
  
  const energyLabels: Record<EnergyLevel, string> = {
    low: t("perfectDay.badges.low"),
    medium: t("perfectDay.badges.medium"),
    high: t("perfectDay.badges.high"),
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline" className="text-xs font-normal">
        {t("perfectDay.badges.sleep")}: {sleepHours}h
      </Badge>
      <Badge variant="outline" className="text-xs font-normal">
        {t("perfectDay.badges.energy")}: {energyLabels[level]}
      </Badge>
      <Badge variant="outline" className="text-xs font-normal">
        {t("perfectDay.badges.goal")}: {t("perfectDay.badges.balance")}
      </Badge>
    </div>
  );
}

export default function PerfectDay() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading, error, refetch, isFetching } = usePerfectDay();
  const { data: profile } = useProfile();
  const [showChangeModal, setShowChangeModal] = useState(false);

  const handleRefresh = () => {
    queryClient.removeQueries({ queryKey: ["perfect-day", user?.id] });
    refetch();
  };

  const handleSelectRoutineOption = (option: "manual" | "templates" | "ai") => {
    // Handle option selection - to be implemented
    console.log("Selected option:", option);
  };

  // Smart back navigation
  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  // Ensure blocks are in correct order and include all periods
  const periodOrder: Period[] = ["morning", "midday", "afternoon", "evening"];
  const orderedBlocks: TimeBlock[] = periodOrder.map((period) => {
    const existingBlock = data?.blocks.find((b) => b.period === period);
    return existingBlock || { period, activities: [] };
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="rounded-full h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">{t("perfectDay.title")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangeModal(true)}
              className="gap-2"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t("perfectDay.changeRoutine")}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isFetching}
              className="rounded-full"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pb-24">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground mb-4">{t("perfectDay.error")}</p>
            <Button onClick={() => refetch()} variant="outline">
              {t("perfectDay.tryAgain")}
            </Button>
          </div>
        ) : data ? (
          <div className="p-4 space-y-6">
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
               <p className="text-sm text-muted-foreground">
                 {t("perfectDay.subtitle")}
               </p>
               <div className="flex items-center gap-2 flex-wrap">
                 <EnergyBadge level={data.energyLevel} sleepHours={data.sleepHours} />
                 {profile?.is_traveling && (
                   <Badge variant="outline" className="text-xs font-normal gap-1">
                     <Plane className="h-3 w-3" />
                     {t("travelMode.active")}
                   </Badge>
                 )}
               </div>
            </motion.div>

            {/* Time Blocks - Always in order: Morning, Midday, Afternoon, Evening */}
            <div className="space-y-3">
              {orderedBlocks.map((block, index) => (
                <TimeBlockCard key={block.period} block={block} index={index} />
              ))}
            </div>

            {/* Closing */}
            <ClosingCard closing={data.closing} />
          </div>
        ) : null}
      </div>

      {/* Change Routine Modal */}
      <ChangeRoutineModal
        open={showChangeModal}
        onOpenChange={setShowChangeModal}
        onSelectOption={handleSelectRoutineOption}
      />
    </div>
  );
}
