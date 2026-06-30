/**
 * Sync TanStack Query's onlineManager with our custom network detection.
 * This gives Instagram/Facebook-like behavior:
 * - Queries serve cached data when offline (no loading spinners)
 * - Mutations pause when offline and auto-retry on reconnect
 * - No flickering, no reload loops
 */
import { onlineManager } from "@tanstack/react-query";

let initialized = false;

export function syncOnlineManager() {
  if (initialized) return;
  initialized = true;

  // Set initial state
  onlineManager.setOnline(navigator.onLine);

  // Listen to browser events to keep TanStack in sync
  const handleOnline = () => onlineManager.setOnline(true);
  const handleOffline = () => onlineManager.setOnline(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
}
