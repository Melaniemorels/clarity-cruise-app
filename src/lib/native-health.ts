/**
 * Native health / wearable readiness (Capacitor + future HealthKit / Health Connect).
 * No UI here — used to gate device "connect" so we do not imply HealthKit sync on web.
 */

import { Capacitor } from "@capacitor/core";

export type DeviceProviderId = "APPLE_HEALTH" | "GOOGLE_FIT";

/**
 * Whether storing a device_connections row is allowed for this platform.
 * Real HealthKit / Health Connect ingestion still requires native modules (not in this repo).
 */
export function canRecordNativeDevicePreference(provider: DeviceProviderId): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  const p = Capacitor.getPlatform();
  if (provider === "APPLE_HEALTH") return p === "ios";
  if (provider === "GOOGLE_FIT") return p === "android";
  return false;
}

export function logHealthNativeDevNote(context: string, provider: DeviceProviderId): void {
  if (!import.meta.env.DEV) return;
  console.info(
    `[health/native] ${context} (${provider}): HealthKit/Health Connect data sync requires native plugins + entitlements; device_connections may only reflect user preference until implemented.`
  );
}
