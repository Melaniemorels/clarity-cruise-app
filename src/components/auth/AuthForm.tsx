import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { SocialSignInButton } from "./SocialSignInButton";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

const signUpSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  handle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(20, "Handle must be less than 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed"),
});

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
};

const KEEP_SIGNED_IN_KEY = "vyv-keep-signed-in";

export function AuthForm() {
  const { t } = useTranslation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      if (isSignUp) {
        signUpSchema.parse({ email, password, handle });
      } else {
        signInSchema.parse({ email, password });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, handle);
        if (error) {
          toast.error(error.message || "Failed to sign up");
        } else {
          toast.success(t("auth.accountCreated"));
        }
      } else {
        localStorage.setItem(KEEP_SIGNED_IN_KEY, JSON.stringify(keepSignedIn));
        if (keepSignedIn) {
          sessionStorage.setItem(KEEP_SIGNED_IN_KEY, "active");
        }

        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message || "Failed to sign in");
        } else {
          sessionStorage.setItem(KEEP_SIGNED_IN_KEY, "active");
          toast.success(t("auth.welcomeBackSuccess"));
        }
      }
    } catch (error: any) {
      toast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Email + password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimatePresence mode="popLayout">
          {isSignUp && (
            <motion.div key="handle-field" {...fadeIn} className="space-y-1.5">
              <Label
                htmlFor="handle"
                className="text-xs font-normal text-muted-foreground"
              >
                {t("auth.username")}
              </Label>
              <Input
                id="handle"
                placeholder="yourhandle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                required
                className="h-12 rounded-xl border-transparent bg-secondary/60 backdrop-blur-sm text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:border-primary/20"
              />
              {errors.handle && (
                <p className="text-xs text-destructive">{errors.handle}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs font-normal text-muted-foreground"
          >
            {t("auth.email")}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-xl border-transparent bg-secondary/60 backdrop-blur-sm text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:border-primary/20"
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-xs font-normal text-muted-foreground"
          >
            {t("auth.password")}
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isSignUp ? 8 : 1}
            className="h-12 rounded-xl border-transparent bg-secondary/60 backdrop-blur-sm text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:border-primary/20"
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password}</p>
          )}
        </div>

        {/* Keep signed in + Forgot password */}
        <AnimatePresence mode="popLayout">
          {!isSignUp && (
            <motion.div
              key="signin-options"
              {...fadeIn}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  id="keep-signed-in"
                  checked={keepSignedIn}
                  onCheckedChange={(checked) => setKeepSignedIn(checked === true)}
                  className="h-4 w-4 rounded border-muted-foreground/30 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <Label
                  htmlFor="keep-signed-in"
                  className="text-xs font-normal text-muted-foreground cursor-pointer"
                >
                  {t("auth.keepSignedIn")}
                </Label>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs text-primary hover:text-primary/80 transition-colors duration-200"
              >
                {t("auth.forgotPassword")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary CTA */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl text-sm font-medium tracking-wide"
        >
          {loading
            ? t("auth.pleaseWait")
            : isSignUp
            ? t("auth.signUp")
            : t("auth.signIn")}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/30" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-muted-foreground/50">
            {t("auth.orContinueWith")}
          </span>
        </div>
      </div>

      {/* Social sign-in — secondary, neutral */}
      <div className="space-y-1.5">
        <SocialSignInButton provider="google" />
        <SocialSignInButton provider="apple" />
      </div>

      {/* Toggle sign-in / sign-up */}
      <div className="text-center pt-1">
        <span className="text-sm text-muted-foreground">
          {isSignUp ? t("auth.alreadyHaveAccount") : t("auth.dontHaveAccount")}{" "}
        </span>
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setErrors({});
          }}
          className="text-sm text-primary font-medium hover:text-primary/80 transition-colors duration-200"
        >
          {isSignUp ? t("auth.signIn") : t("auth.signUp")}
        </button>
      </div>

      {/* Legal links (sign-up only) */}
      <AnimatePresence>
        {isSignUp && (
          <motion.div
            key="legal"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="text-center text-xs text-muted-foreground/60 leading-relaxed">
              <p className="mb-1.5">{t("auth.signUpAgreement")}</p>
              <div className="flex items-center justify-center gap-1.5">
                <Link
                  to="/privacy-policy"
                  className="text-muted-foreground/70 hover:text-foreground transition-colors duration-200 underline underline-offset-2 decoration-border"
                >
                  {t("auth.privacyPolicy")}
                </Link>
                <span>{t("auth.and")}</span>
                <Link
                  to="/terms-of-use"
                  className="text-muted-foreground/70 hover:text-foreground transition-colors duration-200 underline underline-offset-2 decoration-border"
                >
                  {t("auth.termsOfUse")}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
