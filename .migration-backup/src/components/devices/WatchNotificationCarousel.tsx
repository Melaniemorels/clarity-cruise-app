import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Battery, ArrowRightLeft, CalendarClock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface WatchNotification {
  id: string;
  typeKey: string;
  icon: LucideIcon;
  labelKey: string;
  titleKey: string;
  bodyKey: string;
  accentClass: string;
  glowClass: string;
}

export const WATCH_NOTIFICATIONS: WatchNotification[] = [
  {
    id: "focus",
    typeKey: "devices.watchNotifs.types.focus",
    icon: Brain,
    labelKey: "devices.watchNotifs.focus.label",
    titleKey: "devices.watchNotifs.focus.title",
    bodyKey: "devices.watchNotifs.focus.body",
    accentClass: "text-primary",
    glowClass: "bg-primary/15",
  },
  {
    id: "recovery",
    typeKey: "devices.watchNotifs.types.recovery",
    icon: Battery,
    labelKey: "devices.watchNotifs.recovery.label",
    titleKey: "devices.watchNotifs.recovery.title",
    bodyKey: "devices.watchNotifs.recovery.body",
    accentClass: "text-[hsl(var(--category-reading))]",
    glowClass: "bg-[hsl(var(--category-reading)/0.15)]",
  },
  {
    id: "transition",
    typeKey: "devices.watchNotifs.types.transition",
    icon: ArrowRightLeft,
    labelKey: "devices.watchNotifs.transition.label",
    titleKey: "devices.watchNotifs.transition.title",
    bodyKey: "devices.watchNotifs.transition.body",
    accentClass: "text-[hsl(var(--category-study))]",
    glowClass: "bg-[hsl(var(--category-study)/0.15)]",
  },
  {
    id: "calendar",
    typeKey: "devices.watchNotifs.types.calendar",
    icon: CalendarClock,
    labelKey: "devices.watchNotifs.calendar.label",
    titleKey: "devices.watchNotifs.calendar.title",
    bodyKey: "devices.watchNotifs.calendar.body",
    accentClass: "text-[hsl(var(--category-work))]",
    glowClass: "bg-[hsl(var(--category-work)/0.15)]",
  },
];

interface WatchNotificationPreviewProps {
  notification: WatchNotification;
}

const WatchNotificationPreview = ({ notification }: WatchNotificationPreviewProps) => {
  const { t } = useTranslation();
  const Icon = notification.icon;

  return (
    <div className="relative mx-auto w-[180px] h-[220px] flex items-center justify-center">
      {/* Watch body */}
      <div className="absolute inset-0 rounded-[40px] bg-[hsl(var(--background))] border-2 border-border/60 shadow-lg" />

      {/* Watch screen */}
      <div className="relative z-10 w-[152px] h-[190px] rounded-[32px] bg-[hsl(215_28%_6%)] overflow-hidden flex flex-col justify-center px-3.5 py-4">
        {/* Time display */}
        <div className="text-center mb-3">
          <span className="text-[11px] text-[hsl(210_20%_92%/0.4)] font-medium tabular-nums">
            9:41
          </span>
        </div>

        {/* Notification card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="space-y-2"
        >
          {/* App icon + label */}
          <div className="flex items-center gap-1.5">
            <div className={`h-4 w-4 rounded-full ${notification.glowClass} flex items-center justify-center`}>
              <span className={`text-[7px] font-bold ${notification.accentClass}`}>V</span>
            </div>
            <span className={`text-[8px] font-semibold uppercase tracking-wider ${notification.accentClass}`}>
              {t(notification.labelKey)}
            </span>
          </div>

          {/* Title */}
          <p className="text-[11px] font-semibold text-[hsl(210_20%_92%)] leading-tight">
            {t(notification.titleKey)}
          </p>

          {/* Body */}
          <p className="text-[9px] text-[hsl(210_20%_92%/0.55)] leading-snug">
            {t(notification.bodyKey)}
          </p>
        </motion.div>

        {/* Bottom indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[hsl(210_20%_92%/0.15)]" />
      </div>

      {/* Crown button */}
      <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-[6px] h-[20px] rounded-r-sm bg-border/80" />
    </div>
  );
};

interface WatchNotificationCarouselProps {
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

const WatchNotificationCarousel = ({ activeIndex, onIndexChange }: WatchNotificationCarouselProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Watch preview */}
      <div className="py-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
          >
            <WatchNotificationPreview notification={WATCH_NOTIFICATIONS[activeIndex]} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Type selector pills */}
      <div className="flex justify-center gap-1.5">
        {WATCH_NOTIFICATIONS.map((notif, index) => {
          const Icon = notif.icon;
          const isActive = index === activeIndex;

          return (
            <button
              key={notif.id}
              onClick={() => onIndexChange(index)}
              className={`
                flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-medium
                transition-all duration-200
                ${isActive
                  ? `${notif.glowClass} ${notif.accentClass}`
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                }
              `}
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{t(notif.typeKey)}</span>
            </button>
          );
        })}
      </div>

      {/* Dots indicator for mobile */}
      <div className="flex justify-center gap-1.5 sm:hidden">
        {WATCH_NOTIFICATIONS.map((_, index) => (
          <div
            key={index}
            className={`h-1 rounded-full transition-all duration-200 ${
              index === activeIndex ? "w-4 bg-primary" : "w-1 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default WatchNotificationCarousel;
