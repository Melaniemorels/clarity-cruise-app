import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGuide } from "@/contexts/GuideContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { X, ChevronLeft, ChevronRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function GuideTourOverlay() {
  const { t } = useTranslation();
  const { state, tourSteps, nextStep, prevStep, skipTour, getAnchorRect } = useGuide();
  const navigate = useNavigate();
  const location = useLocation();
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!state.tour.running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skipTour();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.tour.running, skipTour]);

  useEffect(() => {
    if (!state.tour.running) return;
    const step = tourSteps[state.tour.stepIndex];
    if (step?.route && location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [state.tour.running, state.tour.stepIndex, tourSteps, navigate, location.pathname]);

  if (!state.tour.running) return null;

  const idx = state.tour.stepIndex;
  const step = tourSteps[idx];
  if (!step) return null;

  const isWelcome = idx === 0;
  const isLast = idx >= tourSteps.length - 1;

  const handleNext = () => {
    if (isLast) {
      skipTour();
      toast(t("guide.tour.finishToast"), { duration: 3000 });
    } else {
      nextStep();
    }
  };

  if (isWelcome) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ backdropFilter: "blur(6px)" }}
      >
        <div className="absolute inset-0 bg-background/80" onClick={skipTour} />
        <div className="relative animate-in fade-in zoom-in-95 duration-300 rounded-3xl border border-border bg-card shadow-2xl w-[min(340px,calc(100vw-48px))] p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">{step.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{step.body}</p>
          <div className="flex justify-center gap-1.5 mb-5">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === 0 ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/20"
                )}
              />
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={skipTour}
              className="flex-1 py-2.5 rounded-2xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"
            >
              {t("guide.tour.skip")}
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {t("guide.tour.start")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const rect = step.anchor ? getAnchorRect(step.anchor) : null;
  const padding = 12;
  const spotlight = rect
    ? {
        x: clamp(rect.x - padding, 0, viewport.w),
        y: clamp(rect.y - padding, 0, viewport.h),
        w: clamp(rect.width + padding * 2, 40, viewport.w),
        h: clamp(rect.height + padding * 2, 40, viewport.h),
      }
    : null;

  const tipWidth = Math.min(300, viewport.w - 32);
  let tipX = viewport.w / 2 - tipWidth / 2;
  let tipY = viewport.h / 2 - 90;
  if (spotlight) {
    tipX = clamp(spotlight.x + spotlight.w / 2 - tipWidth / 2, 16, viewport.w - tipWidth - 16);
    const belowY = spotlight.y + spotlight.h + 14;
    const aboveY = spotlight.y - 14 - 180;
    tipY = belowY + 190 < viewport.h ? belowY : clamp(aboveY, 16, viewport.h - 190);
  }

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest("[data-guide-tooltip]")) return;
      }}
    >
      {spotlight ? (
        <div
          className="absolute rounded-2xl transition-all duration-300 ease-out"
          style={{
            left: spotlight.x,
            top: spotlight.y,
            width: spotlight.w,
            height: spotlight.h,
            boxShadow: "0 0 0 9999px hsl(var(--overlay-dark))",
            background: "transparent",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-background/80" />
      )}

      <div
        data-guide-tooltip
        className="absolute animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-2xl border border-border bg-card shadow-2xl"
        style={{ left: tipX, top: tipY, width: tipWidth }}
      >
        <div className="flex items-center justify-between px-4 pt-3.5">
          <div className="flex gap-1.5">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  i === idx
                    ? "w-5 bg-primary"
                    : i < idx
                    ? "w-1.5 bg-primary/40"
                    : "w-1.5 bg-muted-foreground/20"
                )}
              />
            ))}
          </div>
          <button
            onClick={skipTour}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-4 pt-2.5 pb-1">
          <h3 className="text-sm font-semibold text-foreground leading-tight">{step.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.body}</p>
        </div>

        <div className="flex items-center justify-between px-4 pb-3.5 pt-2">
          {idx <= 2 ? (
            <button
              onClick={skipTour}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("guide.tour.skip")}
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            {idx > 1 && (
              <button
                onClick={prevStep}
                className="flex items-center gap-1 text-[11px] text-foreground px-2.5 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors"
              >
                <ChevronLeft className="h-3 w-3" />
                {t("guide.tour.back")}
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 text-[11px] text-primary-foreground bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-full transition-colors font-medium"
            >
              {isLast ? (
                <>
                  {t("guide.tour.finish")}
                  <Check className="h-3 w-3" />
                </>
              ) : (
                <>
                  {t("guide.tour.next")}
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
