import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { KEEP_SIGNED_IN_KEY } from "@/lib/auth-constants";
import {
  logCallbackUrlDiagnostics,
  logGetSessionResultDev,
} from "@/lib/auth-oauth-diagnostics";
import { useTranslation } from "react-i18next";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const completedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const finishWithSession = (session: Session) => {
      if (cancelled || completedRef.current) return;
      completedRef.current = true;
      sessionStorage.setItem(KEEP_SIGNED_IN_KEY, "active");
      if (import.meta.env.DEV) {
        console.log("[auth callback] Session established, user:", session.user?.id);
      }
      navigate("/", { replace: true });
    };

    const finishWithoutSession = () => {
      if (cancelled || completedRef.current) return;
      completedRef.current = true;
      if (import.meta.env.DEV) {
        console.warn("[auth callback] No session — redirecting to sign-in");
      }
      navigate("/auth", { replace: true });
    };

    const logOAuthUrlErrors = () => {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const err = search.get("error") || hash.get("error");
      const desc = search.get("error_description") || hash.get("error_description");
      if (err) {
        console.error("[auth callback] OAuth provider error:", err, desc ?? "");
      }
    };

    logCallbackUrlDiagnostics();
    logOAuthUrlErrors();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (import.meta.env.DEV) {
        console.log("[auth callback] onAuthStateChange:", {
          event,
          userId: session?.user?.id ?? null,
          expires_at: session?.expires_at ?? null,
        });
      }
      if (session) {
        finishWithSession(session);
      }
    });

    const tryGetSession = async (label: string) => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      logGetSessionResultDev(label, session, error);
      if (session) {
        finishWithSession(session);
      }
    };

    void tryGetSession("initial");

    const delays = [32, 100, 250, 500, 1000, 2000, 3000];
    const timers = delays.map((ms, i) =>
      window.setTimeout(() => {
        if (cancelled || completedRef.current) return;
        void tryGetSession(`retry-${i}`);
      }, ms),
    );

    const failTimer = window.setTimeout(() => {
      if (cancelled || completedRef.current) return;
      void supabase.auth.getSession().then(({ data: { session }, error }) => {
        logGetSessionResultDev("final-timeout", session, error);
        if (session) {
          finishWithSession(session);
        } else {
          if (import.meta.env.DEV) {
            console.warn("[auth callback] Still no session after wait", {
              path: window.location.pathname,
              search: window.location.search,
            });
          }
          finishWithoutSession();
        }
      });
    }, 12000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      timers.forEach(clearTimeout);
      clearTimeout(failTimer);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <span className="ml-3 text-muted-foreground">{t("authCallback.signingIn")}</span>
    </div>
  );
}
