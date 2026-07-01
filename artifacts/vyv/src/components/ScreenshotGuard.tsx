import { ReactNode, useCallback } from "react";
import { useScreenshotProtection } from "@/hooks/use-screenshot-protection";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScreenshotGuardProps {
  enabled: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Snapchat-style screenshot protection wrapper.
 * - Blocks right-click / long-press on images
 * - Prevents drag-to-save
 * - Disables text selection
 * - Blurs content on screenshot attempt detection
 */
export function ScreenshotGuard({
  enabled,
  children,
  className,
}: ScreenshotGuardProps) {
  const { t } = useTranslation();
  const { isBlurred, dismiss } = useScreenshotProtection({
    enabled,
    blurDuration: 3000,
  });

  const blockContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;
      // Block right-click on images and the guard itself
      const target = e.target as HTMLElement;
      if (
        target.tagName === "IMG" ||
        target.tagName === "VIDEO" ||
        target.closest("[data-screenshot-guard]")
      ) {
        e.preventDefault();
      }
    },
    [enabled]
  );

  const blockDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!enabled) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG" || target.tagName === "VIDEO") {
        e.preventDefault();
      }
    },
    [enabled]
  );

  return (
    <div
      data-screenshot-guard
      className={cn("relative", className)}
      onContextMenu={blockContextMenu}
      onDragStart={blockDragStart}
      style={
        enabled
          ? {
              WebkitUserSelect: "none",
              userSelect: "none",
              WebkitTouchCallout: "none",
            }
          : undefined
      }
    >
      {/* Apply pointer-events protection to images via CSS */}
      {enabled && (
        <style>{`
          [data-screenshot-guard] img,
          [data-screenshot-guard] video {
            -webkit-user-drag: none;
            -khtml-user-drag: none;
            -moz-user-drag: none;
            -o-user-drag: none;
            user-drag: none;
            pointer-events: none;
          }
        `}</style>
      )}

      {children}

      {/* Blur overlay — Snapchat-style */}
      {isBlurred && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-xl bg-background/80 animate-in fade-in duration-200"
          onClick={dismiss}
          role="alert"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-2 select-none">
            <Shield className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium tracking-wide text-muted-foreground">
              {t("privacy.screenshotProtected")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
