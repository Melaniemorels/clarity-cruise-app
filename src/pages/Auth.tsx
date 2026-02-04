import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Hexagon } from "lucide-react";
import { z } from "zod";
import { useTranslation } from "react-i18next";

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

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate inputs
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Hexagon
              size={96}
              strokeWidth={1}
              style={{ color: '#6BDFA8', filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.25))' }}
            />
          </div>
          <CardTitle className="text-2xl text-luxury-emerald">
            VYV
          </CardTitle>
          <CardDescription>
            {isSignUp ? t('auth.createAccount') : t('auth.welcomeBack')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="handle">{t('auth.username')}</Label>
                <Input
                  id="handle"
                  placeholder="yourhandle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  required
                />
                {errors.handle && (
                  <p className="text-xs text-destructive">{errors.handle}</p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isSignUp ? 8 : 1}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('auth.pleaseWait') : (isSignUp ? t('auth.signUp') : t('auth.signIn'))}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            {isSignUp ? t('auth.alreadyHaveAccount') + " " : t('auth.dontHaveAccount') + " "}
            <Button
              variant="link"
              className="p-0"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? t('auth.signIn') : t('auth.signUp')}
            </Button>
          </div>

          {isSignUp && (
            <div className="mt-6 pt-4 border-t border-border text-center text-xs text-muted-foreground">
              <p className="mb-2">{t('auth.signUpAgreement')}</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Link 
                  to="/privacy-policy" 
                  className="text-primary hover:underline"
                >
                  {t('auth.privacyPolicy')}
                </Link>
                <span>{t('auth.and')}</span>
                <Link 
                  to="/terms-of-use" 
                  className="text-primary hover:underline"
                >
                  {t('auth.termsOfUse')}
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
