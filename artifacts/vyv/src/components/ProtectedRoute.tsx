import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboardingStep } from "@/hooks/use-onboarding-step";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}

export const ProtectedRoute = ({ children, skipOnboardingCheck = false }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { step, loading: stepLoading } = useOnboardingStep();
  const location = useLocation();

  const loading = authLoading || (user && !skipOnboardingCheck && stepLoading);

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

  // Skip all onboarding checks if flag is set
  if (skipOnboardingCheck) {
    return <>{children}</>;
  }

  // Linear onboarding flow: security → devices → done
  // Once a step is completed, user cannot go back
  if (step === "security" && location.pathname !== "/security-onboarding") {
    return <Navigate to="/security-onboarding" replace />;
  }

  if (step === "devices" && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // If step is "done", allow access to any route
  return <>{children}</>;
};
