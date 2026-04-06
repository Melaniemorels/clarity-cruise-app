import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ResponsiveNav, useNavStyle } from "@/components/ResponsiveNav";
import { AdaptiveHeading } from "@/components/AdaptiveLayout";
import { useDevice } from "@/hooks/use-device";
import { MediaConnectionsSettings } from "@/components/explore/MediaConnectionsSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  consumeMediaOAuthState,
  getMediaOAuthRedirectUri,
} from "@/lib/media-oauth";

export default function MediaConnectionsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const device = useDevice();
  const navStyle = useNavStyle();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const oauthError = params.get("error");
    const state = params.get("state");

    if (!code && !oauthError) return;

    window.history.replaceState({}, "", window.location.pathname);

    if (oauthError) {
      toast.error(
        t("mediaConnections.oauthError", {
          message: oauthError,
        }),
      );
      return;
    }

    if (!code) return;

    const provider = consumeMediaOAuthState(state);
    if (!provider) {
      toast.error(t("mediaConnections.oauthInvalidCallback"));
      return;
    }

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t("mediaConnections.oauthNeedsSignIn"));
        return;
      }

      const redirect_uri = getMediaOAuthRedirectUri();
      const { data, error } = await supabase.functions.invoke("connect-media", {
        body: { code, provider, redirect_uri },
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error("[media OAuth] connect-media invoke error", error);
        }
        toast.error(t("mediaConnections.oauthExchangeFailed"));
        return;
      }

      const payload = data as { ok?: boolean; error?: string } | null;
      if (payload?.error) {
        toast.error(payload.error);
        return;
      }

      if (!payload?.ok) {
        toast.error(t("mediaConnections.oauthExchangeFailed"));
        return;
      }

      const label =
        provider === "spotify"
          ? t("explore.providers.spotify")
          : t("explore.providers.youtube");
      toast.success(
        t("mediaConnections.oauthConnected", { provider: label }),
      );
      queryClient.invalidateQueries({ queryKey: ["media-connections"] });
    })();
  }, [t, queryClient]);

  return (
    <div className="min-h-screen bg-theme-bg transition-all duration-300" style={navStyle}>
      <div className={cn(
        "mx-auto transition-all duration-300",
        device.isDesktop ? "max-w-2xl" : device.isTablet ? "max-w-xl" : "max-w-full"
      )}>
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur bg-theme-bgElevated/80 border-b border-theme-borderSubtle">
          <div className={cn(
            "flex items-center gap-3 transition-all",
            device.isMobile ? "p-4" : "p-5"
          )}>
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <AdaptiveHeading level={1}>
              {t("mediaConnections.connectionsSettings")}
            </AdaptiveHeading>
          </div>
        </div>

        <div className="p-4 space-y-6">
          <MediaConnectionsSettings />
        </div>
      </div>
      <ResponsiveNav />
    </div>
  );
}
