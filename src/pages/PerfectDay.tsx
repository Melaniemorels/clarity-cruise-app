import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw, Sparkles, Sun, Cloud, Moon, Sunrise, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePerfectDay, TimeBlock, Activity, Period } from "@/hooks/use-perfect-day";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const periodIcons: Record<Period, React.ReactNode> = {
  morning: <Sunrise className="h-5 w-5" />,
  midday: <Sun className="h-5 w-5" />,
  afternoon: <Cloud className="h-5 w-5" />,
  evening: <Moon className="h-5 w-5" />,
};

const periodColors: Record<Period, string> = {
  morning: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
  midday: "from-yellow-500/20 to-amber-500/20 border-yellow-500/30",
  afternoon: "from-blue-500/20 to-purple-500/20 border-blue-500/30",
  evening: "from-indigo-500/20 to-violet-500/20 border-indigo-500/30",
};

const activityTypeColors: Record<string, string> = {
  work: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  movement: "bg-green-500/10 text-green-600 dark:text-green-400",
  nutrition: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  rest: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  mindfulness: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
};

function TimeBlockCard({ block, index }: { block: TimeBlock; index: number }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

  const periodLabels: Record<Period, string> = {
    morning: t("perfectDay.periods.morning"),
    midday: t("perfectDay.periods.midday"),
    afternoon: t("perfectDay.periods.afternoon"),
    evening: t("perfectDay.periods.evening"),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={`overflow-hidden border bg-gradient-to-br ${periodColors[block.period]}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{block.icon}</span>
            <div>
              <h3 className="font-semibold text-base">{periodLabels[block.period]}</h3>
              <p className="text-xs text-muted-foreground">
                {block.activities.length} {t("perfectDay.activities")}
              </p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="pt-0 pb-4 space-y-3">
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
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/60 backdrop-blur-sm">
      <span className="text-xl mt-0.5">{activity.icon}</span>
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
      <span className={`text-xs px-2 py-1 rounded-full ${activityTypeColors[activity.type]}`}>
        {activity.type}
      </span>
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
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-6 text-center space-y-3">
          <div className="flex justify-center">
            <span className="text-3xl">{isReflection ? "💭" : "✨"}</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {isReflection ? t("perfectDay.closingReflection") : t("perfectDay.closingAffirmation")}
          </p>
          <p className="text-lg font-medium italic text-foreground">"{closing.text}"</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-5 w-full" />
      <div className="space-y-3 mt-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function PerfectDay() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading, error, refetch, isFetching } = usePerfectDay();

  const handleRefresh = () => {
    queryClient.removeQueries({ queryKey: ["perfect-day", user?.id] });
    refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">{t("perfectDay.title")}</h1>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isFetching}
            className="rounded-full"
          >
            <RefreshCw className={`h-5 w-5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
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
            {/* Greeting & Intention */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <h2 className="text-2xl font-bold">{data.greeting}</h2>
              <p className="text-muted-foreground">{data.intention}</p>
            </motion.div>

            {/* Time Blocks */}
            <div className="space-y-4">
              {data.blocks.map((block, index) => (
                <TimeBlockCard key={block.period} block={block} index={index} />
              ))}
            </div>

            {/* Closing */}
            <ClosingCard closing={data.closing} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
