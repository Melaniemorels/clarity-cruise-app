import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Hexagon } from "lucide-react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

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

const Auth = () => {
  const { t } = useTranslation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
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
          toast.success(t('auth.accountCreated'));
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message || "Failed to sign in");
        } else {
          toast.success(t('auth.welcomeBackSuccess'));
        }
      }
    } catch (error: any) {
      toast.error(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo — focal point */}
        <div className="mb-12 flex flex-col items-center gap-3">
          <Hexagon
            size={56}
            strokeWidth={1.2}
            className="text-primary"
            style={{ filter: 'drop-shadow(0 0 12px hsl(var(--primary) / 0.15))' }}
          />
          <span className="text-lg font-semibold tracking-[0.12em] text-foreground">
            VYV
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <AnimatePresence mode="popLayout">
            {isSignUp && (
              <motion.div key="handle-field" {...fadeIn} className="space-y-1.5">
                <Label
                  htmlFor="handle"
                  className="text-xs font-normal text-muted-foreground"
                >
                  {t('auth.username')}
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
              {t('auth.email')}
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
              {t('auth.password')}
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

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-sm font-medium tracking-wide"
          >
            {loading
              ? t('auth.pleaseWait')
              : isSignUp
              ? t('auth.signUp')
              : t('auth.signIn')}
          </Button>
        </form>

        {/* Toggle sign-in / sign-up */}
        <div className="mt-8 text-center">
          <span className="text-sm text-muted-foreground">
            {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}{" "}
          </span>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-primary font-medium hover:text-primary/80 transition-colors duration-200"
          >
            {isSignUp ? t('auth.signIn') : t('auth.signUp')}
          </button>
        </div>

        {/* Legal links */}
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
              <div className="mt-8 text-center text-xs text-muted-foreground/70 leading-relaxed">
                <p className="mb-1.5">{t('auth.signUpAgreement')}</p>
                <div className="flex items-center justify-center gap-1.5">
                  <Link
                    to="/privacy-policy"
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 underline underline-offset-2 decoration-border"
                  >
                    {t('auth.privacyPolicy')}
                  </Link>
                  <span>{t('auth.and')}</span>
                  <Link
                    to="/terms-of-use"
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 underline underline-offset-2 decoration-border"
                  >
                    {t('auth.termsOfUse')}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Auth;
