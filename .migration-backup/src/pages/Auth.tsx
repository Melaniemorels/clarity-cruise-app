import { Hexagon } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useDevice } from "@/hooks/use-device";
import { useAuth } from "@/contexts/AuthContext";
import { AuthBranding } from "@/components/auth/AuthBranding";
import { AuthForm } from "@/components/auth/AuthForm";

const Auth = () => {
  const { t } = useTranslation();
  const { isDesktop, isTablet, isLandscape, width } = useDevice();
  const { session, loading } = useAuth();

  // Show two-column branding layout on desktop OR tablet landscape with enough width
  const showBrandingPanel = isDesktop || (isTablet && isLandscape && width >= 900);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Branding panel — desktop & tablet landscape */}
      {showBrandingPanel && (
        <div className="flex-1 flex border-r border-border/30">
          <AuthBranding />
        </div>
      )}

      {/* Auth form column */}
      <div
        className={
          showBrandingPanel
            ? "flex-1 flex items-center justify-center px-8"
            : "flex-1 flex flex-col items-center justify-center px-6"
        }
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className={
            isTablet && !showBrandingPanel
              ? "w-full max-w-md rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-8 shadow-sm"
              : "w-full max-w-sm"
          }
        >
          {/* Logo & branding (mobile / tablet portrait) */}
          {!showBrandingPanel && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              className="mb-10 flex flex-col items-center gap-4"
            >
              <Hexagon
                size={56}
                strokeWidth={1.2}
                className="text-primary"
                style={{ filter: "drop-shadow(0 0 12px hsl(var(--primary) / 0.15))" }}
              />
              <div className="flex flex-col items-center gap-1.5">
                <h1 className="text-xl font-semibold tracking-[0.06em] text-foreground">
                  {t("brand.tagline")}
                </h1>
                <p className="text-[13px] font-normal text-muted-foreground/60 tracking-wide">
                  {t("auth.brandSubtitle")}
                </p>
              </div>
            </motion.div>
          )}

          <AuthForm />
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
