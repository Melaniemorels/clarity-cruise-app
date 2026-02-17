import { useState, useEffect, useCallback, useRef } from "react";

export type NetworkState = "online" | "offline" | "slow";

interface NetworkStatus {
  state: NetworkState;
  /** True when transitioning from offline → online */
  justReconnected: boolean;
  /** Effective connection type (4g, 3g, 2g, slow-2g) if available */
  effectiveType: string | null;
  /** Downlink speed in Mbps if available */
  downlink: number | null;
}

const SLOW_THRESHOLD_MBPS = 1.5;
const RECONNECT_DISPLAY_MS = 4000;

export function useNetworkStatus(): NetworkStatus {
  const [state, setState] = useState<NetworkState>(
    navigator.onLine ? "online" : "offline"
  );
  const [justReconnected, setJustReconnected] = useState(false);
  const [effectiveType, setEffectiveType] = useState<string | null>(null);
  const [downlink, setDownlink] = useState<number | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const wasOffline = useRef(!navigator.onLine);

  const checkConnectionQuality = useCallback(() => {
    const conn = (navigator as any).connection;
    if (!conn) return;

    setEffectiveType(conn.effectiveType ?? null);
    setDownlink(conn.downlink ?? null);

    if (navigator.onLine) {
      const isSlow =
        conn.effectiveType === "slow-2g" ||
        conn.effectiveType === "2g" ||
        (typeof conn.downlink === "number" && conn.downlink < SLOW_THRESHOLD_MBPS);
      setState(isSlow ? "slow" : "online");
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      if (wasOffline.current) {
        setJustReconnected(true);
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(() => {
          setJustReconnected(false);
        }, RECONNECT_DISPLAY_MS);
      }
      wasOffline.current = false;
      setState("online");
      checkConnectionQuality();
    };

    const handleOffline = () => {
      wasOffline.current = true;
      setState("offline");
      setJustReconnected(false);
      clearTimeout(reconnectTimer.current);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener("change", checkConnectionQuality);
      checkConnectionQuality();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearTimeout(reconnectTimer.current);
      if (conn) {
        conn.removeEventListener("change", checkConnectionQuality);
      }
    };
  }, [checkConnectionQuality]);

  return { state, justReconnected, effectiveType, downlink };
}
