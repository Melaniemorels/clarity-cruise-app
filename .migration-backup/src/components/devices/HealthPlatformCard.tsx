import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Footprints, Moon, Heart, Activity, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import type { LucideIcon } from "lucide-react";

interface DataType {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  enabled: boolean;
}

interface HealthPlatformCardProps {
  name: string;
  nameKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  colorClass: string;
  connected: boolean;
  lastSyncAt: string | null;
  scopes: string[] | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

const DATA_TYPES: DataType[] = [
  { id: "steps", labelKey: "devices.dataTypes.steps", icon: Footprints, enabled: true },
  { id: "activity", labelKey: "devices.dataTypes.activity", icon: Activity, enabled: true },
  { id: "sleep", labelKey: "devices.dataTypes.sleep", icon: Moon, enabled: true },
  { id: "heart_rate", labelKey: "devices.dataTypes.heartRate", icon: Heart, enabled: true },
];

const HealthPlatformCard = ({
  nameKey,
  descriptionKey,
  icon: Icon,
  colorClass,
  connected,
  lastSyncAt,
  scopes,
  onConnect,
  onDisconnect,
}: HealthPlatformCardProps) => {
  const { t } = useTranslation();

  const enabledScopes = scopes ?? DATA_TYPES.map(d => d.id);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{t(nameKey)}</CardTitle>
                {connected && (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t("devices.connected")}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm mt-1">
                {t(descriptionKey)}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {connected ? (
          <>
            {/* Last sync info */}
            {lastSyncAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {t("devices.lastSync")}: {formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}
                </span>
              </div>
            )}

            {/* Data types enabled */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("devices.dataEnabled")}
              </p>
              <div className="flex flex-wrap gap-2">
                {DATA_TYPES.filter(dt => enabledScopes.includes(dt.id)).map((dataType) => (
                  <div
                    key={dataType.id}
                    className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1"
                  >
                    <dataType.icon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-foreground">{t(dataType.labelKey)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disconnect button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onDisconnect}
            >
              {t("devices.disconnect")}
            </Button>
          </>
        ) : (
          <Button className="w-full" size="sm" onClick={onConnect}>
            {t("devices.connect")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthPlatformCard;
