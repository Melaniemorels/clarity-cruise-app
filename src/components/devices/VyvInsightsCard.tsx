import { Card, CardContent } from "@/components/ui/card";
import { Brain, Sun, Battery, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

const VyvInsightsCard = () => {
  const { t } = useTranslation();

  const insights = [
    {
      icon: Sun,
      labelKey: "devices.insights.focusMode",
      descKey: "devices.insights.focusModeDesc",
    },
    {
      icon: Battery,
      labelKey: "devices.insights.recovery",
      descKey: "devices.insights.recoveryDesc",
    },
    {
      icon: Bell,
      labelKey: "devices.insights.dailyFlow",
      descKey: "devices.insights.dailyFlowDesc",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-foreground">{t("devices.howVyvAdapts")}</h2>
      </div>
      <Card className="bg-muted/30">
        <CardContent className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            {t("devices.insightsDescription")}
          </p>
          {insights.map((insight, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <insight.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t(insight.labelKey)}</p>
                <p className="text-xs text-muted-foreground">{t(insight.descKey)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default VyvInsightsCard;
