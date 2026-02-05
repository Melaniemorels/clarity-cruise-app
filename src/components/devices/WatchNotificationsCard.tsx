import { Card, CardContent } from "@/components/ui/card";
import { Watch, Bell, Activity, Wind } from "lucide-react";
import { useTranslation } from "react-i18next";

const WatchNotificationsCard = () => {
  const { t } = useTranslation();

  const features = [
    { icon: Bell, labelKey: "devices.watch.smartNotifications" },
    { icon: Activity, labelKey: "devices.watch.statusUpdates" },
    { icon: Wind, labelKey: "devices.watch.gentleReminders" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Watch className="h-4 w-4 text-foreground" />
        <h2 className="font-semibold text-foreground">{t("devices.watch.title")}</h2>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            {t("devices.watch.description")}
          </p>

          {/* Feature list */}
          <div className="space-y-2">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2.5">
                <feature.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-foreground">{t(feature.labelKey)}</span>
              </div>
            ))}
          </div>

          {/* Example notification */}
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-[8px] font-bold text-primary">V</span>
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t("devices.watch.exampleLabel")}
              </span>
            </div>
            <p className="text-xs font-medium text-foreground">
              {t("devices.watch.exampleTitle")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t("devices.watch.exampleBody")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WatchNotificationsCard;
