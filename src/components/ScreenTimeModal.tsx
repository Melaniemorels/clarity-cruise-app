import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { Rss, Compass, CalendarDays, User, Clock } from "lucide-react";

interface ModuleUsage {
  module: string;
  seconds: number;
}

interface ScreenTimeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleUsage: ModuleUsage[];
  totalSeconds: number;
}

const MODULE_CONFIG: Record<string, { icon: typeof Rss; labelKey: string; colorClass: string }> = {
  FEED: { icon: Rss, labelKey: "profile.modules.feed", colorClass: "bg-primary" },
  EXPLORE: { icon: Compass, labelKey: "profile.modules.explore", colorClass: "bg-accent" },
  CALENDAR: { icon: CalendarDays, labelKey: "profile.modules.calendar", colorClass: "bg-secondary" },
  PROFILE: { icon: User, labelKey: "profile.modules.profile", colorClass: "bg-muted-foreground" },
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

export const ScreenTimeModal = ({ open, onOpenChange, moduleUsage, totalSeconds }: ScreenTimeModalProps) => {
  const { t } = useTranslation();

  const maxSeconds = Math.max(...moduleUsage.map((m) => m.seconds), 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t("profile.screenTime")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <div className="flex items-center justify-between text-sm mb-4">
            <span className="text-muted-foreground">{t("profile.todayStats")}</span>
            <span className="font-semibold text-lg">{formatDuration(totalSeconds)}</span>
          </div>

          {moduleUsage.length > 0 ? (
            moduleUsage.map(({ module, seconds }) => {
              const config = MODULE_CONFIG[module] || {
                icon: Clock,
                labelKey: module,
                colorClass: "bg-muted-foreground",
              };
              const Icon = config.icon;
              const pct = Math.min(100, (seconds / maxSeconds) * 100);

              return (
                <div key={module} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {t(config.labelKey, { defaultValue: module })}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{formatDuration(seconds)}</span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${config.colorClass} rounded-full transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              {t("profile.noActivityToday")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
