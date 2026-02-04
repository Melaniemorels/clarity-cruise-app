import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Watch, Smartphone, Activity, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const DeviceOnboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completeOnboarding = async () => {
    if (!user) return false;

    try {
      setIsSubmitting(true);
      // Use type assertion since types may not be synced yet
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("user_id", user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error completing onboarding:", error);
      return false;
    }
  };

  const handleConnectNow = async () => {
    const success = await completeOnboarding();
    if (success) {
      // Force page reload to refresh onboarding state
      window.location.href = "/device-settings";
    }
  };

  const handleDoItLater = async () => {
    const success = await completeOnboarding();
    if (success) {
      // Force page reload to refresh onboarding state
      window.location.href = "/";
    }
  };

  const devices = [
    { icon: Heart, label: t("onboarding.devices.appleHealth") },
    { icon: Watch, label: t("onboarding.devices.smartwatch") },
    { icon: Smartphone, label: t("onboarding.devices.fitnessApps") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Activity className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-foreground">
            {t("onboarding.devices.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("onboarding.devices.description")}
          </p>
        </div>

        {/* Compatible Devices */}
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            {devices.map((device, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <device.icon className="h-5 w-5 text-foreground" />
                </div>
                <span className="text-sm text-foreground">{device.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button className="w-full" size="lg" onClick={handleConnectNow} disabled={isSubmitting}>
            {t("onboarding.devices.connectNow")}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            size="lg"
            onClick={handleDoItLater}
            disabled={isSubmitting}
          >
            {t("onboarding.devices.doItLater")}
          </Button>
        </div>

        {/* Privacy note */}
        <p className="text-xs text-center text-muted-foreground">
          {t("onboarding.devices.privacyNote")}
        </p>
      </div>
    </div>
  );
};

export default DeviceOnboarding;
