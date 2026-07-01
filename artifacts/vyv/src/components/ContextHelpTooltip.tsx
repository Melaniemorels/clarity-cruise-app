/**
 * ContextHelpTooltip — Auto-showing glass tooltip for first-visit pages.
 * Appears once per `helpKey`, auto-dismisses after `autoDismissMs`.
 * Uses the VYV glass "old money" aesthetic.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useVYVContextHelp } from "@/hooks/use-context-help";
import { cn } from "@/lib/utils";

interface ContextHelpTooltipProps {
  /** Unique key — shown only once per key (e.g. "feed:header", "calendar:views") */
  helpKey: string;
  /** Title of the tooltip */
  title: string;
  /** Body text explaining the section */
  body: string;
  /** Ref to the anchor element the tooltip points to */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Delay before showing (ms). Default 800 */
  delayMs?: number;
  /** Auto-dismiss after (ms). 0 = manual only. Default 8000 */
  autoDismissMs?: number;
  /** Placement relative to anchor */
  placement?: "top" | "bottom";
}

export function ContextHelpTooltip({
  helpKey,
  title,
  body,
  anchorRef,
  delayMs = 800,
  autoDismissMs = 8000,
  placement = "bottom",
}: ContextHelpTooltipProps) {
  const { shouldShow, markShown } = useVYVContextHelp();
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const canShow = shouldShow(helpKey);

  // Show after delay
  useEffect(() => {
    if (!canShow) return;
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [canShow, delayMs]);

  // Position calculation
  useEffect(() => {
    if (!visible || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const tooltipW = 300;
    const x = Math.max(12, Math.min(rect.left + rect.width / 2 - tooltipW / 2, window.innerWidth - tooltipW - 12));
    const y = placement === "bottom" ? rect.bottom + 10 : rect.top - 10;
    setPosition({ x, y });
  }, [visible, anchorRef, placement]);

  // Auto-dismiss
  useEffect(() => {
    if (!visible || autoDismissMs === 0) return;
    timerRef.current = setTimeout(() => dismiss(), autoDismissMs);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, autoDismissMs]);

  const dismiss = () => {
    setVisible(false);
    markShown(helpKey);
  };

  if (!visible || !position) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9997] pointer-events-none" aria-live="polite">
      <div
        className={cn(
          "absolute pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300",
          "w-[300px] rounded-2xl p-4",
          "bg-card/90 dark:bg-card/80 backdrop-blur-[18px]",
          "border border-border/40 dark:border-border/30",
          "shadow-[0_12px_32px_rgba(0,0,0,0.10)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        )}
        style={{
          left: position.x,
          ...(placement === "bottom" ? { top: position.y } : { bottom: window.innerHeight - position.y }),
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground tracking-tight">{title}</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</p>
          </div>
          <button
            onClick={dismiss}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors flex-shrink-0"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
        {/* Progress bar for auto-dismiss */}
        {autoDismissMs > 0 && (
          <div className="mt-3 h-0.5 rounded-full bg-border/40 overflow-hidden">
            <div
              className="h-full bg-primary/40 rounded-full"
              style={{
                animation: `contextHelpShrink ${autoDismissMs}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>
      <style>{`
        @keyframes contextHelpShrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>,
    document.body
  );
}
