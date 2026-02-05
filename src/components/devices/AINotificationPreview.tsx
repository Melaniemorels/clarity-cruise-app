import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Brain, Battery, ArrowRightLeft, CalendarClock, Shield } from "lucide-react";
import type { GenerateResult, WatchNotificationData } from "@/hooks/use-watch-notifications";

interface AINotificationPreviewProps {
  result: GenerateResult;
}

const ICON_MAP: Record<string, typeof Brain> = {
  focus: Brain,
  recovery: Battery,
  transition: ArrowRightLeft,
  calendar: CalendarClock,
};

const ACCENT_MAP: Record<string, { text: string; bg: string }> = {
  focus: { text: "text-primary", bg: "bg-primary/10" },
  recovery: { text: "text-[hsl(var(--category-reading))]", bg: "bg-[hsl(var(--category-reading)/0.1)]" },
  transition: { text: "text-[hsl(var(--category-study))]", bg: "bg-[hsl(var(--category-study)/0.1)]" },
  calendar: { text: "text-[hsl(var(--category-work))]", bg: "bg-[hsl(var(--category-work)/0.1)]" },
};

const STRESS_COLORS: Record<string, string> = {
  low: "text-primary",
  moderate: "text-[hsl(var(--category-work))]",
  high: "text-destructive",
};

const AINotificationPreview = ({ result }: AINotificationPreviewProps) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3 pt-2"
    >
      {/* Context signals summary */}
      {result.signals && (
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t("devices.watchNotifs.aiSignals", "Context")}:
            </span>
          </div>
          <span className="text-muted-foreground">
            {result.signals.calendar.eventCount}{" "}
            {t("devices.watchNotifs.aiEvents", "events")}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground capitalize">
            {result.signals.calendar.load}{" "}
            {t("devices.watchNotifs.aiLoad", "load")}
          </span>
        </div>
      )}

      {/* Generated notifications */}
      <div className="space-y-2">
        {result.notifications.map((notif, index) => (
          <NotificationCard key={index} notification={notif} index={index} />
        ))}
      </div>

      {/* Today count */}
      <p className="text-[10px] text-muted-foreground text-center">
        {t("devices.watchNotifs.aiTodayCount", "{{count}} of 5 notifications used today", {
          count: result.todayCount,
        })}
      </p>
    </motion.div>
  );
};

interface NotificationCardProps {
  notification: WatchNotificationData;
  index: number;
}

const NotificationCard = ({ notification, index }: NotificationCardProps) => {
  const { t } = useTranslation();
  const Icon = ICON_MAP[notification.notification_type] || Brain;
  const accent = ACCENT_MAP[notification.notification_type] || ACCENT_MAP.focus;
  const stressColor =
    STRESS_COLORS[notification.context_signals?.stress_level] || "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.1 }}
      className="rounded-lg border border-border/50 p-3 space-y-1.5"
    >
      <div className="flex items-center gap-2">
        <div
          className={`h-6 w-6 rounded-full ${accent.bg} flex items-center justify-center`}
        >
          <Icon className={`h-3 w-3 ${accent.text}`} />
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${accent.text}`}>
          VYV · {t(`devices.watchNotifs.types.${notification.notification_type}`)}
        </span>
      </div>

      <p className="text-sm font-medium text-foreground leading-tight">
        {notification.title}
      </p>
      <p className="text-xs text-muted-foreground">{notification.body}</p>

      {/* Subtle context indicator */}
      {notification.context_signals && (
        <div className="flex items-center gap-2 pt-1">
          <span className={`text-[9px] ${stressColor}`}>
            {t("devices.watchNotifs.aiStress", "Stress")}: {notification.context_signals.stress_level}
          </span>
          <span className="text-[9px] text-muted-foreground">·</span>
          <span className="text-[9px] text-muted-foreground">
            {t("devices.watchNotifs.aiEnergy", "Energy")}: {notification.context_signals.energy_level}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default AINotificationPreview;
