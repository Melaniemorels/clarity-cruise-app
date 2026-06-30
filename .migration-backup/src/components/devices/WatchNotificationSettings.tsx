import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { WATCH_NOTIFICATIONS } from "./WatchNotificationCarousel";

interface NotificationToggle {
  id: string;
  enabled: boolean;
}

interface WatchNotificationSettingsProps {
  toggles: NotificationToggle[];
  onToggle: (id: string, enabled: boolean) => void;
}

const WatchNotificationSettings = ({ toggles, onToggle }: WatchNotificationSettingsProps) => {
  const { t } = useTranslation();

  const getToggleState = (id: string) =>
    toggles.find((toggle) => toggle.id === id)?.enabled ?? true;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        {t("devices.watchNotifs.customize")}
      </p>

      <div className="space-y-0.5">
        {WATCH_NOTIFICATIONS.map((notif) => {
          const Icon = notif.icon;
          const enabled = getToggleState(notif.id);

          return (
            <div
              key={notif.id}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`h-7 w-7 rounded-full ${notif.glowClass} flex items-center justify-center`}>
                  <Icon className={`h-3.5 w-3.5 ${notif.accentClass}`} />
                </div>
                <div>
                  <p className="text-sm text-foreground">{t(notif.typeKey)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t(`devices.watchNotifs.${notif.id}.desc`)}
                  </p>
                </div>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => onToggle(notif.id, checked)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WatchNotificationSettings;
