import { Hexagon } from "lucide-react";
import { motion } from "framer-motion";
import { useDevice } from "@/hooks/use-device";
import { AuthBranding } from "@/components/auth/AuthBranding";
import { AuthForm } from "@/components/auth/AuthForm";

const Auth = () => {
  const { isDesktop, isTablet } = useDevice();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop: Two-column layout with branding panel */}
      {isDesktop && (
        <div className="flex-1 flex border-r border-border/30">
          <AuthBranding />
        </div>
      )}

      {/* Auth form column */}
      <div
        className={
          isDesktop
            ? "flex-1 flex items-center justify-center px-8"
            : "flex-1 flex items-center justify-center px-6"
        }
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className={
            isTablet
              ? "w-full max-w-md rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-8 shadow-sm"
              : isDesktop
              ? "w-full max-w-sm"
              : "w-full max-w-sm"
          }
        >
          {/* Logo (shown on mobile/tablet — desktop shows it in branding panel) */}
          {!isDesktop && (
            <div className="mb-10 flex flex-col items-center gap-3">
              <Hexagon
                size={56}
                strokeWidth={1.2}
                className="text-primary"
                style={{ filter: "drop-shadow(0 0 12px hsl(var(--primary) / 0.15))" }}
              />
              <span className="text-lg font-semibold tracking-[0.08em] text-foreground">
                Visualize Your Vibe
              </span>
            </div>
          )}

          <AuthForm />
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
