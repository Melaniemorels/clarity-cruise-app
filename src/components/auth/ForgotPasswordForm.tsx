import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { z } from "zod";

interface ForgotPasswordFormProps {
  onBack: () => void;
}

const emailSchema = z.string().email("Invalid email address");

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      emailSchema.parse(email);
    } catch {
      setError(t("auth.invalidEmail"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
        toast.success(t("auth.resetEmailSent"));
      }
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="space-y-6"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </button>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          {t("auth.forgotPassword")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("auth.forgotPasswordDesc")}
        </p>
      </div>

      {sent ? (
        <div className="space-y-4 py-4">
          <div className="rounded-xl bg-primary/10 p-4 text-center">
            <p className="text-sm text-foreground">
              {t("auth.resetEmailSentDesc")}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="w-full h-12 rounded-xl text-sm"
          >
            {t("auth.backToSignIn")}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label
              htmlFor="reset-email"
              className="text-xs font-normal text-muted-foreground"
            >
              {t("auth.email")}
            </Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-12 rounded-xl border-transparent bg-secondary/60 backdrop-blur-sm text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:border-primary/20"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-sm font-medium tracking-wide"
          >
            {loading ? t("auth.pleaseWait") : t("auth.sendResetLink")}
          </Button>
        </form>
      )}
    </motion.div>
  );
}
