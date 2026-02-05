import { Card, CardContent } from "@/components/ui/card";
import { Zap, Watch, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

const CompatibleDevicesCard = () => {
  const { t } = useTranslation();

  const wearables = [
    { name: "Apple Watch", icon: Watch },
    { name: "Oura Ring", icon: Zap },
    { name: "Whoop", icon: Activity },
  ];

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">{t("devices.compatible.title")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("devices.compatible.description")}
            </p>
          </div>
          <div className="flex gap-3">
            {wearables.map((device) => (
              <div key={device.name} className="flex items-center gap-1.5">
                <device.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{device.name}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/70">
            {t("devices.moreDevicesDesc", "More devices supported through health platforms like Apple Health. Additional integrations coming soon.")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompatibleDevicesCard;
