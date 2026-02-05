import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Watch, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import WatchNotificationCarousel from "./WatchNotificationCarousel";
import WatchNotificationSettings from "./WatchNotificationSettings";

interface NotificationToggle {
  id: string;
  enabled: boolean;
}

const WatchNotificationsCard = () => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [toggles, setToggles] = useState<NotificationToggle[]>([
    { id: "focus", enabled: true },
    { id: "recovery", enabled: true },
    { id: "transition", enabled: true },
    { id: "calendar", enabled: true },
  ]);

  const handleToggle = (id: string, enabled: boolean) => {
    setToggles((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled } : t))
    );
  };

  const enabledCount = toggles.filter((t) => t.enabled).length;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Watch className="h-4 w-4 text-foreground" />
          <h2 className="font-semibold text-foreground">
            {t("devices.watchNotifs.title")}
          </h2>
        </div>
        <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
          V1
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground">
        {t("devices.watchNotifs.description")}
      </p>

      {/* Watch preview card */}
      <Card>
        <CardContent className="p-4">
          <WatchNotificationCarousel
            activeIndex={activeIndex}
            onIndexChange={setActiveIndex}
          />
        </CardContent>
      </Card>

      {/* Notification settings */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <WatchNotificationSettings
            toggles={toggles}
            onToggle={handleToggle}
          />

          {/* Separator */}
          <div className="h-px bg-border" />

          {/* Frequency rules */}
          <div className="space-y-2.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("devices.watchNotifs.frequencyRules")}
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="h-1 w-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {t("devices.watchNotifs.ruleMaxDaily")}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1 w-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {t("devices.watchNotifs.ruleRecoveryOverride")}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1 w-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {t("devices.watchNotifs.ruleTapToOpen")}
                </p>
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-border" />

          {/* Status footer */}
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">
              {t("devices.watchNotifs.statusActive", { count: enabledCount })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WatchNotificationsCard;
