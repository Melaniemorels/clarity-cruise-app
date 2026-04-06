import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSupabaseProjectRef } from "@/lib/auth-oauth-diagnostics";

interface SocialSignInButtonProps {
  provider: "google" | "apple";
}

function GoogleIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export function SocialSignInButton({ provider }: SocialSignInButtonProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback`;

    if (import.meta.env.DEV) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      console.groupCollapsed(`[auth] OAuth start → ${provider}`);
      console.log("redirectTo (app)", redirectTo);
      console.log("VITE_SUPABASE_URL host", supabaseUrl ? new URL(supabaseUrl).host : "(missing)");
      console.log("project ref", getSupabaseProjectRef() ?? "(unknown)");
      console.log("signInWithOAuth options", {
        provider,
        redirectTo,
        ...(provider === "google" && {
          scopes: "https://www.googleapis.com/auth/youtube.readonly",
          queryParams: { access_type: "offline", prompt: "consent" },
        }),
      });
      console.groupEnd();
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          ...(provider === "google" && {
            scopes: "https://www.googleapis.com/auth/youtube.readonly",
            queryParams: {
              access_type: "offline",
              prompt: "consent",
            },
          }),
        },
      });

      if (error) {
        console.error("[auth] signInWithOAuth failed:", provider, error.message, error);
        toast.error(error.message || t("errors.generic"));
        return;
      }

      if (import.meta.env.DEV) {
        let redirectHost: string | undefined;
        try {
          redirectHost = data?.url ? new URL(data.url).host : undefined;
        } catch {
          redirectHost = undefined;
        }
        console.log("[auth] OAuth redirect issued:", {
          provider,
          hasUrl: !!data?.url,
          redirectHost,
        });
      }

      // Browser follows data.url; if no redirect (e.g. misconfiguration), stop loading
      if (!data?.url) {
        console.warn("[auth] signInWithOAuth returned no redirect URL — check Supabase URL config.");
        toast.error(t("errors.generic"));
      }
    } catch (e) {
      console.error("[auth] signInWithOAuth exception:", provider, e);
      toast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  const label = provider === "google"
    ? t("auth.signInWithGoogle")
    : t("auth.signInWithApple");

  return (
    <Button
      type="button"
      variant="outline"
      disabled={loading}
      onClick={handleSignIn}
      className="w-full h-11 rounded-xl text-[13px] font-normal border-border/30 bg-transparent hover:bg-secondary/30 text-muted-foreground hover:text-foreground transition-all duration-200 gap-2.5"
    >
      {provider === "google" ? <GoogleIcon /> : <AppleIcon />}
      {loading ? t("auth.pleaseWait") : label}
    </Button>
  );
}
