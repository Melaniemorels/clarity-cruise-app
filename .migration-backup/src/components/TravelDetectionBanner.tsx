import { useTranslation } from "react-i18next";
import { useTravelDetection } from "@/hooks/use-travel-detection";
import { Plane, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export function TravelDetectionBanner() {
  const { t } = useTranslation();
  const {
    isTravelDetected,
    reason,
    currentTimezone,
    homeTimezone,
    dismiss,
    activateTravelMode,
  } = useTravelDetection();

  if (!isTravelDetected) return null;

  const tzLabel = (tz: string | null) =>
    tz?.split("/").pop()?.replace(/_/g, " ") ?? "";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mx-4 mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Plane className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{t("travelMode.title")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {reason === "timezone"
                ? t("travelMode.differentTimezone", {
                    current: tzLabel(currentTimezone),
                    home: tzLabel(homeTimezone),
                  })
                : t("travelMode.calendarDetected")}
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="default"
                className="h-8 text-xs"
                onClick={activateTravelMode}
              >
                <Plane className="h-3 w-3 mr-1.5" />
                {t("travelMode.activate")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={dismiss}
              >
                {t("common.close")}
              </Button>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
