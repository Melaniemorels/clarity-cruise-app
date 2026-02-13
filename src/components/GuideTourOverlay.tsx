import { useEffect, useState } from "react";
import { useGuide } from "@/contexts/GuideContext";
import { cn } from "@/lib/utils";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function GuideTourOverlay() {
  const { state, steps, getAnchorRect, next, prev, stop } = useGuide();
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!state.active.running || !state.active.stepIds.length) return null;

  const idx = state.active.stepIndex;
  const stepId = state.active.stepIds[idx];
  const step = steps.find((s) => s.id === stepId);
  if (!step) return null;

  const rect = getAnchorRect(step.anchor);
  const hasRect = !!rect;
  const padding = 12;

  const spotlight = hasRect
    ? {
        x: clamp(rect!.x - padding, 0, viewport.w),
        y: clamp(rect!.y - padding, 0, viewport.h),
        w: clamp(rect!.width + padding * 2, 40, viewport.w),
        h: clamp(rect!.height + padding * 2, 40, viewport.h),
      }
    : { x: viewport.w / 2 - 80, y: viewport.h / 2 - 40, w: 160, h: 80 };

  // Tooltip positioning
  const tipWidth = Math.min(300, viewport.w - 32);
  const tipX = clamp(spotlight.x + spotlight.w / 2 - tipWidth / 2, 16, viewport.w - tipWidth - 16);
  const belowY = spotlight.y + spotlight.h + 14;
  const aboveY = spotlight.y - 14 - 160;
  const tipY = belowY + 170 < viewport.h ? belowY : clamp(aboveY, 16, viewport.h - 170);

  const isLast = idx >= state.active.stepIds.length - 1;
  const total = state.active.stepIds.length;

  return (
    <div
      className="fixed inset-0 z-[9999]"
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest("[data-guide-tooltip]")) return;
        if (isLast) stop();
        else next();
      }}
    >
      {/* Spotlight hole via box-shadow */}
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

      {/* Tooltip */}
      <div
        data-guide-tooltip
        className="absolute animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-2xl border border-border bg-card shadow-2xl"
        style={{ left: tipX, top: tipY, width: tipWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-between px-4 pt-3.5">
          <div className="flex gap-1.5">
            {state.active.stepIds.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  i === idx ? "w-5 bg-primary" : i < idx ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted-foreground/20"
                )}
              />
            ))}
          </div>
          <button
            onClick={stop}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pt-2.5 pb-1">
          <h3 className="text-sm font-semibold text-foreground leading-tight">{step.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.body}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 pb-3.5 pt-2">
          <button
            onClick={stop}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Omitir
          </button>
          <div className="flex gap-2">
            {idx > 0 && (
              <button
                onClick={prev}
                className="flex items-center gap-1 text-[11px] text-foreground px-2.5 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors"
              >
                <ChevronLeft className="h-3 w-3" />
                Atrás
              </button>
            )}
            <button
              onClick={() => (isLast ? stop() : next())}
              className="flex items-center gap-1 text-[11px] text-primary-foreground bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-full transition-colors font-medium"
            >
              {isLast ? (
                <>
                  Listo
                  <Check className="h-3 w-3" />
                </>
              ) : (
                <>
                  Siguiente
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
