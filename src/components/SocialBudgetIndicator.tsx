import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatTimeDisplay, formatMinutesDisplay } from "@/hooks/use-social-budget";
import { cn } from "@/lib/utils";

interface SocialBudgetIndicatorProps {
  secondsUsed: number;
  dailyLimitSeconds: number;
  progressPercent: number;
  isUnlimited: boolean;
  className?: string;
}

export function SocialBudgetIndicator({
  secondsUsed,
  dailyLimitSeconds,
  progressPercent,
  isUnlimited,
  className,
}: SocialBudgetIndicatorProps) {
  const { t } = useTranslation();

  if (isUnlimited) {
    return null;
  }

  const minutesUsed = Math.floor(secondsUsed / 60);
  const dailyLimitMinutes = Math.floor(dailyLimitSeconds / 60);

  // Color states based on progress
  const getProgressColor = () => {
    if (progressPercent >= 100) return "bg-destructive";
    if (progressPercent >= 80) return "bg-amber-500";
    return "bg-primary";
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-xl bg-secondary/50 border border-border",
      className
    )}>
      <Clock 
        className={cn(
          "w-4 h-4 flex-shrink-0",
          progressPercent >= 80 ? "text-amber-500" : "text-muted-foreground"
        )} 
        strokeWidth={1.5} 
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground truncate">
            {t('socialBudget.timeToday')}
          </span>
          <span className={cn(
            "text-xs font-medium tabular-nums",
            progressPercent >= 80 ? "text-amber-500" : "text-foreground"
          )}>
            {minutesUsed}/{dailyLimitMinutes} min
          </span>
        </div>
        <Progress 
          value={progressPercent} 
          className="h-1.5"
        />
      </div>
    </div>
  );
}
