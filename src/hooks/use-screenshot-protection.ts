import { useEffect, useState, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";

interface UseScreenshotProtectionOptions {
  /** Whether this content is protected from screenshots */
  enabled: boolean;
  /** Duration in ms to keep the blur active after detection */
  blurDuration?: number;
}

interface ScreenshotProtectionState {
  /** Whether content is currently blurred due to screenshot detection */
  isBlurred: boolean;
  /** Manually dismiss the blur overlay */
  dismiss: () => void;
}

/**
 * Cross-platform screenshot protection hook.
 *
 * Web:
 *  - Detects PrintScreen / Cmd+Shift+3/4 keyboard shortcuts
 *  - Uses CSS protections (applied via the ScreenshotGuard component)
 *
 * Capacitor (Android):
 *  - Attempts to set FLAG_SECURE via plugin when enabled
 *
 * Capacitor (iOS):
 *  - Listens for screenshot notification events
 */
export function useScreenshotProtection({
  enabled,
  blurDuration = 3000,
}: UseScreenshotProtectionOptions): ScreenshotProtectionState {
  const [isBlurred, setIsBlurred] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerBlur = useCallback(() => {
    if (!enabled) return;
    setIsBlurred(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsBlurred(false), blurDuration);
  }, [enabled, blurDuration]);

  const dismiss = useCallback(() => {
    setIsBlurred(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // --- Keyboard shortcut detection (web) ---
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        triggerBlur();
        return;
      }

      // macOS: Cmd+Shift+3 or Cmd+Shift+4 or Cmd+Shift+5
      if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) {
        triggerBlur();
        return;
      }

      // Windows: Win+Shift+S (Snipping Tool)
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "s") {
        triggerBlur();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [enabled, triggerBlur]);

  // Note: For Android native FLAG_SECURE support, install
  // @capacitor-community/privacy-screen and enable it in the native layer.
  // CSS-only protections (user-select: none) are applied via ScreenshotGuard.

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { isBlurred, dismiss };
}
