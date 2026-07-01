import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Shield, Mail, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboardingStep } from "@/hooks/use-onboarding-step";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import vyvLogo from "@/assets/vyv-logo.png";

const SecurityOnboarding = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { completeSecurityStep, loading } = useOnboardingStep();
  const [isResending, setIsResending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const emailVerified = user?.email_confirmed_at !== null;
  const progress = emailVerified ? 100 : 0;

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/security-onboarding`,
        },
      });
      if (error) throw error;
      toast.success(t("security.emailSent"));
    } catch (error: any) {
      console.error("Error resending verification:", error);
      toast.error(error.message || t("errors.generic"));
    } finally {
      setIsResending(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (data.user?.email_confirmed_at) {
        toast.success(t("security.emailVerified"));
        window.location.reload();
      } else {
        toast.info(t("security.emailNotVerifiedYet"));
      }
    } catch (error: any) {
      console.error("Error refreshing session:", error);
      toast.error(error.message || t("errors.generic"));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleContinue = async () => {
    setIsCompleting(true);
    const success = await completeSecurityStep();
    if (success) window.location.href = "/onboarding";
    setIsCompleting(false);
  };

  const handleSkip = async () => {
    setIsCompleting(true);
    const success = await completeSecurityStep();
    if (success) window.location.href = "/onboarding";
    setIsCompleting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="flex items-center gap-3 px-1">
          <img src={vyvLogo} alt="VYV" className="h-9 w-9 rounded-xl border border-border/40" />
          <div>
            <div className="text-sm font-bold tracking-wide text-foreground">VYV</div>
            <div className="text-xs text-muted-foreground">{t("brand.tagline")}</div>
          </div>
        </div>

        {/* Glass card */}
        <div className="rounded-[20px] border border-border/40 bg-card/80 backdrop-blur-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.45)] p-5 space-y-5">
          {/* Icon + title */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {t("security.title")}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("security.description")}
            </p>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("security.progress")}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {/* Email verification */}
          <div
            className={`p-4 rounded-2xl border ${
              emailVerified
                ? "border-primary/20 bg-primary/5"
                : "border-destructive/20 bg-destructive/5"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  emailVerified ? "bg-primary/15" : "bg-destructive/15"
                }`}
              >
                {emailVerified ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-primary" />
                ) : (
                  <Mail className="w-4.5 h-4.5 text-destructive" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-foreground">
                  {t("security.emailVerification")}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {emailVerified
                    ? t("security.emailVerifiedMessage")
                    : t("security.emailNotVerifiedMessage")}
                </p>
                {user?.email && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{user.email}</p>
                )}
              </div>
            </div>

            {!emailVerified && (
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="flex-1 rounded-xl text-xs"
                >
                  {isResending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {t("security.resendEmail")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshStatus}
                  disabled={isRefreshing}
                  className="flex-1 rounded-xl text-xs"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  {t("security.checkStatus")}
                </Button>
              </div>
            )}
          </div>

          {/* Warning */}
          {!emailVerified && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-destructive/5 border border-destructive/15">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("security.verifyWarning")}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2.5 pt-1">
            <Button
              className="w-full rounded-[14px]"
              size="lg"
              onClick={handleContinue}
              disabled={!emailVerified || isCompleting}
            >
              {isCompleting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
              {t("security.continue")}
            </Button>

            {!emailVerified && (
              <Button
                variant="ghost"
                className="w-full rounded-[14px]"
                size="lg"
                onClick={handleSkip}
                disabled={isCompleting}
              >
                {t("security.doItLater")}
              </Button>
            )}
          </div>

          {emailVerified && (
            <p className="text-center text-xs text-muted-foreground">
              {t("security.accountSecured")}
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-[11px] text-center text-muted-foreground/60">
          Tu privacidad es lo primero.
        </p>
      </div>
    </div>
  );
};

export default SecurityOnboarding;
