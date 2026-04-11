import { useEffect, useState, useCallback, useRef } from "react";

interface UseScreenshotProtectionOptions {
  enabled: boolean;
  blurDuration?: number;
}

interface ScreenshotProtectionState {
  isBlurred: boolean;
  dismiss: () => void;
}

/**
 * Cross-platform screenshot protection hook (Snapchat-style).
 *
 * Detection layers:
 *  1. Keyboard shortcuts (PrintScreen, Cmd+Shift+3/4/5, Win+Shift+S)
 *  2. Visibility API – iOS takes a snapshot when the app goes to background;
 *     we blur instantly when the page becomes hidden.
 *  3. Context-menu prevention on the wrapped region (handled via ScreenshotGuard).
 *  4. CSS protections (user-select: none, pointer-events on images) via component.
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
      if (e.key === "PrintScreen") {
        e.preventDefault();
        triggerBlur();
        return;
      }
      if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) {
        triggerBlur();
        return;
      }
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "s") {
        triggerBlur();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [enabled, triggerBlur]);

  // --- Visibility API: blur when page hidden (iOS screenshot / app-switcher) ---
  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        triggerBlur();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [enabled, triggerBlur]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { isBlurred, dismiss };
}
