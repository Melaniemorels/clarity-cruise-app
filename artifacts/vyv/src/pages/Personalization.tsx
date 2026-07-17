import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Briefcase, GraduationCap, Dumbbell, Users, HeartPulse, Palette, Brain, Lock, Calendar, UserCheck, Leaf, Zap } from "lucide-react";
import { useOnboardingStep } from "@/hooks/use-onboarding-step";
import { toast } from "sonner";
import VyvLogo from "@/components/VyvLogo";
import { HEALTH_PHASE2_ENABLED } from "@/lib/feature-flags";

const FOCUS_OPTIONS = [
  { key: "work", icon: Briefcase },
  { key: "study", icon: GraduationCap },
  { key: "fitness", icon: Dumbbell },
  { key: "social", icon: Users },
  { key: "selfcare", icon: HeartPulse },
  { key: "creativity", icon: Palette },
] as const;

const INTEREST_OPTIONS = [
  { key: "fitness", icon: Dumbbell },
  { key: "wellness", icon: Leaf },
  { key: "social", icon: Users },
  { key: "productivity", icon: Zap },
  { key: "creativity", icon: Palette },
] as const;

const TONE_OPTIONS = ["gentle", "direct"] as const;

const Personalization = () => {
  const { t } = useTranslation();
  const { completePersonalizationStep } = useOnboardingStep();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [aiTone, setAiTone] = useState<(typeof TONE_OPTIONS)[number]>("gentle");
  const [connectCalendar, setConnectCalendar] = useState(false);
  const [shareAvailability, setShareAvailability] = useState(true);
  const [startPrivate, setStartPrivate] = useState(false);

  const toggleFocus = (key: string) => {
    setFocusAreas((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const toggleInterest = (key: string) => {
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const submit = async (skipped: boolean) => {
    setIsSubmitting(true);
    const success = await completePersonalizationStep(
      skipped
        ? { skipped: true }
        : {
            skipped: false,
            focus_areas: focusAreas,
            interests,
            ai_tone: aiTone,
            connect_calendar: connectCalendar,
            share_availability: shareAvailability,
            start_private: startPrivate,
          },
      skipped ? undefined : { is_private: startPrivate },
    );
    if (success) {
      // Device onboarding is parked for Phase 2 — go straight to the app.
      window.location.href = HEALTH_PHASE2_ENABLED ? "/onboarding" : "/";
    } else {
      toast.error(t("onboarding.personalization.saveError"));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="flex items-center gap-3 px-1">
          <VyvLogo className="h-9 w-9" withShadow />
          <div>
            <div className="text-sm font-bold tracking-wide text-foreground">VYV</div>
            <div className="text-xs text-muted-foreground">{t("brand.tagline")}</div>
          </div>
        </div>

        {/* Glass card */}
        <div className="rounded-[20px] border border-border/40 bg-card/80 backdrop-blur-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.45)] p-5 space-y-5">
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {t("onboarding.personalization.title")}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("onboarding.personalization.description")}
            </p>
          </div>

          {/* Focus areas */}
          <div className="space-y-2.5">
            <p className="text-sm font-medium text-foreground">
              {t("onboarding.personalization.focusQuestion")}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {FOCUS_OPTIONS.map(({ key, icon: Icon }) => {
                const selected = focusAreas.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleFocus(key)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border/30 bg-muted/30"
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm text-foreground">
                      {t(`onboarding.personalization.focus.${key}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interest areas */}
          <div className="space-y-2.5">
            <p className="text-sm font-medium text-foreground">
              {t("onboarding.personalization.interestsQuestion")}
            </p>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map(({ key, icon: Icon }) => {
                const selected = interests.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleInterest(key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm transition-colors ${
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/30 bg-muted/30 text-foreground"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                    {t(`onboarding.personalization.interests.${key}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connect calendar */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/30 bg-muted/30">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-sm text-foreground">
                  {t("onboarding.personalization.calendarQuestion")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("onboarding.personalization.calendarHint")}
                </p>
              </div>
            </div>
            <Switch checked={connectCalendar} onCheckedChange={setConnectCalendar} />
          </div>

          {/* Share availability */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/30 bg-muted/30">
            <div className="flex items-center gap-3">
              <UserCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-sm text-foreground">
                  {t("onboarding.personalization.availabilityQuestion")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("onboarding.personalization.availabilityHint")}
                </p>
              </div>
            </div>
            <Switch checked={shareAvailability} onCheckedChange={setShareAvailability} />
          </div>

          {/* AI tone */}
          <div className="space-y-2.5">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              {t("onboarding.personalization.toneQuestion")}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setAiTone(tone)}
                  className={`p-3 rounded-2xl border text-center text-sm transition-colors ${
                    aiTone === tone
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/30 bg-muted/30 text-foreground"
                  }`}
                >
                  {t(`onboarding.personalization.tone.${tone}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/30 bg-muted/30">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-sm text-foreground">
                  {t("onboarding.personalization.privateQuestion")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("onboarding.personalization.privateHint")}
                </p>
              </div>
            </div>
            <Switch checked={startPrivate} onCheckedChange={setStartPrivate} />
          </div>

          {/* Actions */}
          <div className="space-y-2.5 pt-1">
            <Button
              className="w-full rounded-[14px]"
              size="lg"
              onClick={() => submit(false)}
              disabled={isSubmitting}
            >
              {t("onboarding.personalization.continue")}
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-[14px]"
              size="lg"
              onClick={() => submit(true)}
              disabled={isSubmitting}
            >
              {t("onboarding.personalization.skip")}
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-center text-muted-foreground/60">
          {t("onboarding.personalization.note")}
        </p>
      </div>
    </div>
  );
};

export default Personalization;
