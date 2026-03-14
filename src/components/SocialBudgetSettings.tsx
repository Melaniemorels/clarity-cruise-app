import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFeedSettings, useUpdateFeedSettings, type DailyLimitOption } from "@/hooks/use-social-budget";
import { cn } from "@/lib/utils";

const LIMIT_VALUES = [10, 15, 20, 30, 0] as const;

export function SocialBudgetSettings() {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useFeedSettings();
  const updateSettings = useUpdateFeedSettings();

  const currentLimit = settings?.daily_feed_minutes ?? 15;

  const handleLimitChange = (value: number) => {
    updateSettings.mutate({ daily_feed_minutes: value });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3" />
        <div className="h-10 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Timer className="h-5 w-5 text-primary" />
        <div>
          <Label className="text-base">{t('socialBudget.settingsTitle')}</Label>
          <p className="text-sm text-muted-foreground">
            {t('socialBudget.settingsDescription')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {LIMIT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleLimitChange(option.value)}
            disabled={updateSettings.isPending}
            className={cn(
              "h-10 rounded-xl text-sm font-medium transition-all",
              "border border-border hover:border-primary/50",
              currentLimit === option.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/50 text-foreground hover:bg-secondary"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {currentLimit === 0 
          ? t('socialBudget.unlimitedHint')
          : t('socialBudget.limitHint', { minutes: currentLimit })}
      </p>
    </div>
  );
}
