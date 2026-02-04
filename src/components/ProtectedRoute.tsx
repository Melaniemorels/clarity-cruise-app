import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useSecurityOnboarding } from "@/hooks/use-security-onboarding";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}

export const ProtectedRoute = ({ children, skipOnboardingCheck = false }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { onboardingCompleted, loading: onboardingLoading } = useOnboarding();
  const { securityOnboardingCompleted, emailVerified, loading: securityLoading } = useSecurityOnboarding();
  const location = useLocation();

  const loading = authLoading || (user && !skipOnboardingCheck && (onboardingLoading || securityLoading));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Security onboarding flow (email verification) - first priority
  if (!skipOnboardingCheck && !securityOnboardingCompleted && location.pathname !== "/security-onboarding") {
    // If email is not verified, redirect to security onboarding
    if (!emailVerified) {
      return <Navigate to="/security-onboarding" replace />;
    }
  }

  // Device onboarding - second priority (after security is complete)
  if (!skipOnboardingCheck && securityOnboardingCompleted && onboardingCompleted === false && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
