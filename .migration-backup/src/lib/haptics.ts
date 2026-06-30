import { Capacitor } from "@capacitor/core";

type HapticStyle = "light" | "medium" | "heavy" | "selection";

/**
 * Trigger haptic feedback on supported devices.
 * Falls back silently on web/unsupported platforms.
 */
export async function triggerHaptic(style: HapticStyle = "light"): Promise<void> {
  // Only attempt haptics on native platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Dynamically import to avoid bundling issues on web
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");

    switch (style) {
      case "light":
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case "medium":
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case "heavy":
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case "selection":
        await Haptics.selectionStart();
        await Haptics.selectionEnd();
        break;
    }
  } catch (error) {
    // Silently fail - haptics are not critical
    console.debug("Haptics not available:", error);
  }
}
