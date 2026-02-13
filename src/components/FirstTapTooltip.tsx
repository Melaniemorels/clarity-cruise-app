import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useGuide, type FirstTapId } from "@/contexts/GuideContext";
import { X } from "lucide-react";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

interface FirstTapTooltipProps {
  tapId: FirstTapId;
  pageKey: string; // one tooltip per page per session
  title: string;
  body: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  show: boolean;
}

export function FirstTapTooltip({ tapId, pageKey, title, body, anchorRef, show }: FirstTapTooltipProps) {
  const { isFirstTap, markFirstTap, isTourRunning, sessionTooltipShown, markSessionTooltip } = useGuide();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const shouldShow = show && isFirstTap(tapId) && !isTourRunning && !sessionTooltipShown.has(pageKey);

  useEffect(() => {
    if (!shouldShow || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const below = rect.bottom + 120 < window.innerHeight;
    setPosition({
      x: clamp(rect.left + rect.width / 2 - 140, 16, window.innerWidth - 296),
      y: below ? rect.bottom + 8 : rect.top - 108,
    });
  }, [shouldShow, anchorRef]);

  const handleDismiss = () => {
    markFirstTap(tapId);
    markSessionTooltip(pageKey);
  };

  if (!shouldShow || !position) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998]" onClick={handleDismiss}>
      <div
        className="absolute animate-in fade-in slide-in-from-bottom-2 duration-200 rounded-2xl border border-border bg-card shadow-2xl p-4 w-[280px]"
        style={{ left: position.x, top: position.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
