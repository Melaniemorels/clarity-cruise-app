import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProfileWithOnboarding {
  onboarding_completed: boolean;
}

export function useOnboarding() {
  const { user } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Use raw query since types may not be synced yet
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        const profile = data as unknown as ProfileWithOnboarding | null;
        setOnboardingCompleted(profile?.onboarding_completed ?? false);
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setOnboardingCompleted(true); // Default to completed to avoid blocking
      } finally {
        setLoading(false);
      }
    };

    checkOnboarding();
  }, [user]);

  return { onboardingCompleted, loading };
}
