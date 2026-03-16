import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Hexagon, Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[0-9]/, "Must contain a number");

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if this is a valid recovery session
  useEffect(() => {
    const checkRecoverySession = async () => {
      // The hash fragment contains the recovery token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get("type");
      const accessToken = hashParams.get("access_token");

      if (type === "recovery" && accessToken) {
        setIsRecovery(true);
        // Supabase client will automatically pick up the session from the URL
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get("refresh_token") || "",
        });
        if (error) {
          console.error("Error setting recovery session:", error);
        }
      } else {
        // Also check if user landed here with an active recovery session
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setIsRecovery(true);
        }
      }
      setChecking(false);
    };

    checkRecoverySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate password
    try {
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordsDontMatch", "Passwords don't match"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        setSuccess(true);
        toast.success(t("auth.passwordUpdated", "Password updated successfully"));
        // Redirect to main app after a short delay
        setTimeout(() => navigate("/", { replace: true }), 2000);
      }
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <Hexagon size={48} strokeWidth={1.2} className="text-primary mb-6" />
        <h1 className="text-lg font-semibold text-foreground mb-2">
          {t("auth.invalidResetLink", "Invalid or expired link")}
        </h1>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
          {t("auth.invalidResetLinkDesc", "This password reset link is invalid or has expired. Please request a new one.")}
        </p>
        <Button onClick={() => navigate("/auth", { replace: true })}>
          {t("auth.backToSignIn", "Back to Sign In")}
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-lg font-semibold text-foreground mb-2">
          {t("auth.passwordUpdated", "Password updated")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("auth.redirecting", "Redirecting...")}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-4 mb-6">
          <Hexagon size={48} strokeWidth={1.2} className="text-primary" />
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">
              {t("auth.setNewPassword", "Set new password")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("auth.setNewPasswordDesc", "Enter your new password below")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-normal text-muted-foreground">
              {t("auth.newPassword", "New password")}
            </Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              className="h-12 rounded-xl"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs font-normal text-muted-foreground">
              {t("auth.confirmPassword", "Confirm password")}
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              className="h-12 rounded-xl"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-sm font-medium">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.pleaseWait")}
              </>
            ) : (
              t("auth.updatePassword", "Update password")
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
