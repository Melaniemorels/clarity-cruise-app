import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Apple, Smartphone, Activity, ChevronLeft, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useOnboardingStep } from "@/hooks/use-onboarding-step";
import type { Database } from "@/integrations/supabase/types";
import HealthPlatformCard from "@/components/devices/HealthPlatformCard";
import VyvInsightsCard from "@/components/devices/VyvInsightsCard";
import WatchNotificationsCard from "@/components/devices/WatchNotificationsCard";
import CompatibleDevicesCard from "@/components/devices/CompatibleDevicesCard";
import {
  canRecordNativeDevicePreference,
  logHealthNativeDevNote,
} from "@/lib/native-health";

type DeviceProvider = Database["public"]["Enums"]["device_provider"];

interface DeviceConnection {
  id: string;
  provider: DeviceProvider;
  connected_at: string | null;
  last_sync_at: string | null;
  scopes: string[] | null;
}

// Health platforms are the primary connections — VYV reads from these
const HEALTH_PLATFORMS: Array<{
  id: DeviceProvider;
  nameKey: string;
  name: string;
  icon: any;
  descriptionKey: string;
  colorClass: string;
}> = [
  {
    id: "APPLE_HEALTH",
    name: "Apple Health",
    nameKey: "devices.platforms.appleHealth",
    icon: Apple,
    descriptionKey: "devices.platforms.appleHealthDesc",
    colorClass: "text-foreground",
  },
  {
    id: "GOOGLE_FIT",
    name: "Google Fit",
    nameKey: "devices.platforms.googleFit",
    icon: Smartphone,
    descriptionKey: "devices.platforms.googleFitDesc",
    colorClass: "text-primary",
  },
];

const DeviceSettings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { step, completeDevicesStep } = useOnboardingStep();
  const [connections, setConnections] = useState<DeviceConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const isFromOnboarding = step === "devices";

  useEffect(() => {
    fetchConnections();
  }, [user]);

  const fetchConnections = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("device_connections")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching device connections:", error);
      }
      toast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  const getConnection = (platformId: DeviceProvider) => {
    return connections.find((conn) => conn.provider === platformId);
  };

  const handleConnect = async (platformId: DeviceProvider, platformName: string) => {
    if (!user) return;
    if (!canRecordNativeDevicePreference(platformId)) {
      toast.info(
        platformId === "APPLE_HEALTH"
          ? t("devices.appleHealthNativeOnly")
          : t("devices.googleFitNativeOnly")
      );
      logHealthNativeDevNote("connect blocked (web or wrong platform)", platformId);
      return;
    }
    logHealthNativeDevNote("recording preference row (HealthKit/Health Connect sync not implemented)", platformId);
    try {
      const { error } = await supabase.from("device_connections").insert({
        user_id: user.id,
        provider: platformId,
        connected_at: new Date().toISOString(),
      });
      if (error) throw error;
      await fetchConnections();
      toast.success(t("devices.connectedSuccess", { device: platformName }));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error connecting platform:", error);
      }
      toast.error(t("errors.generic"));
    }
  };

  const handleDisconnect = async (platformId: DeviceProvider, platformName: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("device_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", platformId);
      if (error) throw error;
      await fetchConnections();
      toast.success(t("devices.disconnectedSuccess", { device: platformName }));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error disconnecting platform:", error);
      }
      toast.error(t("errors.generic"));
    }
  };

  const handleBack = async () => {
    if (isFromOnboarding) {
      const success = await completeDevicesStep();
      if (success) {
        window.location.href = "/";
      }
    } else {
      navigate(-1);
    }
  };

  const connectedCount = connections.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("devices.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("devices.subtitle")}</p>
          </div>
        </div>

        {/* VYV Intelligence Intro */}
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t("devices.vyvIntelligence")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("devices.vyvIntelligenceDesc")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connected status summary */}
        {connectedCount > 0 && (
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground font-medium">
              {t("devices.platformsConnected", { count: connectedCount })}
            </span>
          </div>
        )}

        {/* Health Platforms */}
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">{t("devices.healthPlatforms")}</h2>
          {HEALTH_PLATFORMS.map((platform) => {
            const connection = getConnection(platform.id);
            return (
              <HealthPlatformCard
                key={platform.id}
                name={platform.name}
                nameKey={platform.nameKey}
                descriptionKey={platform.descriptionKey}
                icon={platform.icon}
                colorClass={platform.colorClass}
                connected={!!connection}
                lastSyncAt={connection?.last_sync_at ?? null}
                scopes={connection?.scopes ?? null}
                onConnect={() => handleConnect(platform.id, t(platform.nameKey))}
                onDisconnect={() => handleDisconnect(platform.id, t(platform.nameKey))}
              />
            );
          })}
        </div>

        {/* How VYV adapts your day */}
        <VyvInsightsCard />

        {/* Watch & Wearable Notifications (V1) */}
        <WatchNotificationsCard />

        {/* Compatible wearables */}
        <CompatibleDevicesCard />

        {/* Auto sync info */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div className="text-sm">
                <p className="font-medium mb-1">{t("devices.autoSync")}</p>
                <p className="text-muted-foreground text-xs">{t("devices.autoSyncDesc")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Done Button - only show when coming from onboarding */}
        {isFromOnboarding && (
          <Button className="w-full" size="lg" onClick={handleBack}>
            {t("common.done")}
          </Button>
        )}
      </div>
    </div>
  );
};

export default DeviceSettings;
