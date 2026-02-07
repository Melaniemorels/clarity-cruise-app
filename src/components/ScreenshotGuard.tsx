import { ReactNode } from "react";
import { useScreenshotProtection } from "@/hooks/use-screenshot-protection";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScreenshotGuardProps {
  /** Whether protection is active on this content */
  enabled: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps content with screenshot protection.
 * When a screenshot attempt is detected, the content blurs and a minimal
 * "Protected content" message appears. Navigation is NOT interrupted.
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

  return (
    <div
      className={cn("relative", className)}
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
      {children}

      {/* Blur overlay — slides in without blocking navigation */}
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
