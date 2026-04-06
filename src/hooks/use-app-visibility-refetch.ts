import { useEffect, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

/**
 * Refetches queries when the tab or WebView becomes visible again (resume from background).
 * Works in browsers and Capacitor without extra plugins.
 */
export function useAppVisibilityRefetch(queryKeys: QueryKey[]) {
  const queryClient = useQueryClient();
  const keysRef = useRef(queryKeys);
  keysRef.current = queryKeys;

  useEffect(() => {
    const invalidate = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      keysRef.current.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    };

    document.addEventListener("visibilitychange", invalidate);
    window.addEventListener("focus", invalidate);
    return () => {
      document.removeEventListener("visibilitychange", invalidate);
      window.removeEventListener("focus", invalidate);
    };
  }, [queryClient]);
}
