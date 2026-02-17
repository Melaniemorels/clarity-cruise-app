import { createContext, useContext, useEffect, useCallback, useRef } from "react";
import { useNetworkStatus, type NetworkState } from "@/hooks/use-network-status";
import { flushQueue, getQueueSize } from "@/lib/offline-queue";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface NetworkContextType {
  state: NetworkState;
  justReconnected: boolean;
  isOffline: boolean;
  isSlow: boolean;
  effectiveType: string | null;
  downlink: number | null;
}

const NetworkContext = createContext<NetworkContextType>({
  state: "online",
  justReconnected: false,
  isOffline: false,
  isSlow: false,
  effectiveType: null,
  downlink: null,
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const { state, justReconnected, effectiveType, downlink } = useNetworkStatus();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const hasSynced = useRef(false);

  const syncOfflineData = useCallback(async () => {
    const queueSize = getQueueSize();
    if (queueSize === 0) return;

    const { synced, failed } = await flushQueue();
    if (synced > 0) {
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
    }
    if (failed > 0) {
      console.warn(`[NetworkProvider] ${failed} actions still pending`);
    }
  }, [queryClient]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (justReconnected && !hasSynced.current) {
      hasSynced.current = true;
      syncOfflineData();
    }
    if (state === "offline") {
      hasSynced.current = false;
    }
  }, [justReconnected, state, syncOfflineData]);

  const value: NetworkContextType = {
    state,
    justReconnected,
    isOffline: state === "offline",
    isSlow: state === "slow",
    effectiveType,
    downlink,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextType {
  return useContext(NetworkContext);
}
