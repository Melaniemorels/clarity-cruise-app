import { useNetwork } from "@/contexts/NetworkContext";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi, AlertTriangle } from "lucide-react";

export function NetworkStatusBanner() {
  const { state, justReconnected, isOffline, isSlow } = useNetwork();
  const { t } = useTranslation();

  const showBanner = isOffline || justReconnected || isSlow;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="overflow-hidden z-50 relative"
        >
          {isOffline && (
            <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-muted/80 backdrop-blur-sm border-b border-border/30">
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground text-center">
                {t("network.offline", "You're offline. Keep focusing. We'll sync when you're back.")}
              </span>
            </div>
          )}

          {justReconnected && !isOffline && (
            <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/5 backdrop-blur-sm border-b border-primary/10">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              >
                <Wifi className="h-3.5 w-3.5 text-primary shrink-0" />
              </motion.div>
              <span className="text-xs text-primary/80 text-center">
                {t("network.backOnline", "Back online. Syncing your vibes.")}
              </span>
            </div>
          )}

          {isSlow && !isOffline && !justReconnected && (
            <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-muted/60 backdrop-blur-sm border-b border-border/20">
              <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
              <span className="text-xs text-muted-foreground/70 text-center">
                {t("network.slow", "Slow connection detected. Loading lighter content.")}
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
