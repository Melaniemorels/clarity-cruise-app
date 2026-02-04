import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProfileWithSecurityOnboarding {
  security_onboarding_completed: boolean;
}

export function useSecurityOnboarding() {
  const { user } = useAuth();
  const [securityOnboardingCompleted, setSecurityOnboardingCompleted] = useState<boolean | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSecurityOnboarding = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if email is verified from user metadata
        setEmailVerified(user.email_confirmed_at !== null);

        // Check security onboarding status from profile
        const { data, error } = await supabase
          .from("profiles")
          .select("security_onboarding_completed")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        const profile = data as unknown as ProfileWithSecurityOnboarding | null;
        setSecurityOnboardingCompleted(profile?.security_onboarding_completed ?? false);
      } catch (error) {
        console.error("Error checking security onboarding status:", error);
        setSecurityOnboardingCompleted(true); // Default to completed to avoid blocking
      } finally {
        setLoading(false);
      }
    };

    checkSecurityOnboarding();
  }, [user]);

  const completeSecurityOnboarding = async () => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ security_onboarding_completed: true } as any)
        .eq("user_id", user.id);

      if (error) throw error;
      setSecurityOnboardingCompleted(true);
      return true;
    } catch (error) {
      console.error("Error completing security onboarding:", error);
      return false;
    }
  };

  return { 
    securityOnboardingCompleted, 
    emailVerified, 
    loading,
    completeSecurityOnboarding 
  };
}
