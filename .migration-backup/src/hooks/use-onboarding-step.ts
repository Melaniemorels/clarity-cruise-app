import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type OnboardingStep = "security" | "devices" | "done";

interface ProfileOnboardingState {
  security_onboarding_completed: boolean;
  onboarding_completed: boolean;
}

/**
 * Unified onboarding step hook that derives the current step from
 * security_onboarding_completed and onboarding_completed flags.
 * 
 * Flow: security → devices → done
 */
export function useOnboardingStep() {
  const { user } = useAuth();
  const [step, setStep] = useState<OnboardingStep | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStep = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("security_onboarding_completed, onboarding_completed")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      const profile = data as unknown as ProfileOnboardingState | null;
      const securityDone = profile?.security_onboarding_completed ?? false;
      const devicesDone = profile?.onboarding_completed ?? false;

      // Derive step from flags
      if (!securityDone) {
        setStep("security");
      } else if (!devicesDone) {
        setStep("devices");
      } else {
        setStep("done");
      }
    } catch (error) {
      console.error("Error fetching onboarding step:", error);
      // Default to done to avoid blocking the user
      setStep("done");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStep();
  }, [fetchStep]);

  const completeSecurityStep = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ security_onboarding_completed: true } as any)
        .eq("user_id", user.id);

      if (error) throw error;
      setStep("devices");
      return true;
    } catch (error) {
      console.error("Error completing security step:", error);
      return false;
    }
  }, [user]);

  const completeDevicesStep = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("user_id", user.id);

      if (error) throw error;
      setStep("done");
      return true;
    } catch (error) {
      console.error("Error completing devices step:", error);
      return false;
    }
  }, [user]);

  return {
    step,
    loading,
    completeSecurityStep,
    completeDevicesStep,
    refetch: fetchStep,
  };
}
