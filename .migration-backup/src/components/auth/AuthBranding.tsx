import { Hexagon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

export function AuthBranding() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      className="hidden lg:flex flex-col justify-center items-center px-12 xl:px-20"
    >
      <div className="flex flex-col items-start gap-6">
        <Hexagon
          size={56}
          strokeWidth={1}
          className="text-primary"
          style={{ filter: "drop-shadow(0 0 16px hsl(var(--primary) / 0.15))" }}
        />
        <span className="text-2xl font-semibold tracking-[0.08em] text-foreground">
          {t("brand.tagline")}
        </span>
        <p className="text-sm font-normal text-muted-foreground/70 tracking-wide">
          {t("auth.brandSubtitle")}
        </p>
      </div>
    </motion.div>
  );
}
