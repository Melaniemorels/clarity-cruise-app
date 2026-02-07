import { Hexagon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

export function AuthBranding() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="hidden lg:flex flex-col justify-center items-center px-12 xl:px-20"
    >
      <div className="max-w-sm space-y-10">
        <div className="flex flex-col items-start gap-4">
          <Hexagon
            size={64}
            strokeWidth={1}
            className="text-primary"
            style={{ filter: "drop-shadow(0 0 16px hsl(var(--primary) / 0.2))" }}
          />
          <span className="text-2xl font-semibold tracking-[0.14em] text-foreground">
            VYV
          </span>
        </div>

        <div className="space-y-6">
          <p className="text-xl font-light text-foreground/90 leading-relaxed">
            {t("welcome.tagline")}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("welcome.description")}
          </p>
        </div>

        <div className="space-y-3 pt-4">
          {["quickCapture", "focusMode", "wellness"].map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground">
                {t(`welcome.features.${feature}`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
