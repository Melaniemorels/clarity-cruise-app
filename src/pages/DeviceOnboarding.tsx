import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Watch, Smartphone, Activity, Heart } from "lucide-react";
import { useOnboardingStep } from "@/hooks/use-onboarding-step";
import vyvLogo from "@/assets/vyv-logo.png";

const DeviceOnboarding = () => {
  const { t } = useTranslation();
  const { completeDevicesStep } = useOnboardingStep();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConnectNow = () => {
    window.location.href = "/device-settings";
  };

  const handleDoItLater = async () => {
    setIsSubmitting(true);
    const success = await completeDevicesStep();
    if (success) window.location.href = "/";
    setIsSubmitting(false);
  };

  const devices = [
    { icon: Heart, label: t("onboarding.devices.appleHealth") },
    { icon: Watch, label: t("onboarding.devices.smartwatch") },
    { icon: Smartphone, label: t("onboarding.devices.fitnessApps") },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="flex items-center gap-3 px-1">
          <img src={vyvLogo} alt="VYV" className="h-9 w-9 rounded-xl border border-border/40" />
          <div>
            <div className="text-sm font-bold tracking-wide text-foreground">VYV</div>
            <div className="text-xs text-muted-foreground">Visualize Your Vibe</div>
          </div>
        </div>

        {/* Glass card */}
        <div className="rounded-[20px] border border-border/40 bg-card/80 backdrop-blur-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.45)] p-5 space-y-5">
          {/* Icon + title */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
              <Activity className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {t("onboarding.devices.title")}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("onboarding.devices.description")}
            </p>
          </div>

          {/* Compatible devices — mini cards grid */}
          <div className="grid grid-cols-1 gap-2.5">
            {devices.map((device, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/30 bg-muted/30"
              >
                <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                  <device.icon className="h-4.5 w-4.5 text-foreground" />
                </div>
                <span className="text-sm text-foreground">{device.label}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2.5 pt-1">
            <Button
              className="w-full rounded-[14px]"
              size="lg"
              onClick={handleConnectNow}
              disabled={isSubmitting}
            >
              {t("onboarding.devices.connectNow")}
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-[14px]"
              size="lg"
              onClick={handleDoItLater}
              disabled={isSubmitting}
            >
              {t("onboarding.devices.doItLater")}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-center text-muted-foreground/60">
          {t("onboarding.devices.privacyNote")}
        </p>
      </div>
    </div>
  );
};

export default DeviceOnboarding;
