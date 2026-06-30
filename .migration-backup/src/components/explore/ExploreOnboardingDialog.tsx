import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Music, Youtube, Sparkles, ArrowRight, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDevice } from "@/hooks/use-device";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const ONBOARDING_KEY = "vyv_explore_onboarding_seen";

const PROVIDERS = [
  {
    id: "spotify",
    name: "Spotify",
    icon: Music,
    gradient: "from-[hsl(141,73%,42%)]/15 to-[hsl(141,73%,42%)]/5",
    iconColor: "text-[hsl(141,73%,42%)]",
    description: "exploreOnboarding.spotifyDesc",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: Youtube,
    gradient: "from-[hsl(0,100%,50%)]/10 to-[hsl(0,100%,50%)]/5",
    iconColor: "text-[hsl(0,100%,50%)]",
    description: "exploreOnboarding.youtubeDesc",
  },
];

export function ExploreOnboardingDialog() {
  const { t } = useTranslation();
  const device = useDevice();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const key = `${ONBOARDING_KEY}_${user.id}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleSkip = () => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "true");
    }
    setOpen(false);
  };

  const handleConnect = (_providerId: string) => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "true");
    }
    setOpen(false);
    // Navigate handled by the button wrapping — delegate to media-connections page
  };

  const handleContinue = () => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "true");
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent className={cn(
        "gap-0 p-0 overflow-hidden",
        device.isMobile ? "max-w-[calc(100%-2rem)]" : "max-w-md"
      )}>
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-4 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg">
              {t("exploreOnboarding.title")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {t("exploreOnboarding.description")}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* What AI uses */}
          <div className="rounded-xl bg-muted/50 p-3.5 space-y-2">
            <p className="text-xs font-medium text-foreground">
              {t("exploreOnboarding.whatWeUse")}
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-primary">📅</span>
                {t("exploreOnboarding.calendarSignal")}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">🏃</span>
                {t("exploreOnboarding.activitySignal")}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">🎯</span>
                {t("exploreOnboarding.goalsSignal")}
              </li>
            </ul>
          </div>

          {/* Optional: Connect services */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <span>{t("exploreOnboarding.optionalConnect")}</span>
            </p>
            {PROVIDERS.map((provider) => {
              const Icon = provider.icon;
              return (
                <button
                  key={provider.id}
                  onClick={() => {
                    handleConnect(provider.id);
                    navigate("/media-connections");
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border border-border/50",
                    "hover:border-border transition-all text-left",
                    "bg-gradient-to-r", provider.gradient
                  )}
                >
                  <div className="p-2 rounded-lg bg-background/80">
                    <Icon className={cn("h-4 w-4", provider.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{provider.name}</span>
                    <p className="text-[11px] text-muted-foreground">
                      {t(provider.description)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Privacy note */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Shield className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{t("exploreOnboarding.privacyNote")}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-0 flex gap-3">
          <Button
            variant="ghost"
            className="flex-1 text-sm"
            onClick={handleSkip}
          >
            {t("exploreOnboarding.skip")}
          </Button>
          <Button
            className="flex-1 text-sm"
            onClick={handleContinue}
          >
            {t("exploreOnboarding.continue")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
