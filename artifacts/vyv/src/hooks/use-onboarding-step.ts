import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { HEALTH_PHASE2_ENABLED } from "@/lib/feature-flags";

export type OnboardingStep = "security" | "profile" | "personalization" | "devices" | "done";

interface ProfileOnboardingState {
  security_onboarding_completed: boolean;
  profile_setup_completed: boolean;
  personalization_completed: boolean;
  onboarding_completed: boolean;
}

/**
 * Unified onboarding step hook that derives the current step from
 * security_onboarding_completed, profile_setup_completed,
 * personalization_completed and onboarding_completed flags.
 *
 * Flow: security → profile → personalization → devices → done
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
        .select("security_onboarding_completed, profile_setup_completed, personalization_completed, onboarding_completed")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      const profile = data as unknown as ProfileOnboardingState | null;
      const securityDone = profile?.security_onboarding_completed ?? false;
      const profileDone = profile?.profile_setup_completed ?? false;
      const personalizationDone = profile?.personalization_completed ?? false;
      const devicesDone = profile?.onboarding_completed ?? false;

      // Derive step from flags. Existing users who already finished
      // onboarding (devicesDone) skip the newer steps.
      if (!securityDone) {
        setStep("security");
      } else if (!profileDone && !devicesDone) {
        setStep("profile");
      } else if (!personalizationDone && !devicesDone) {
        setStep("personalization");
      } else if (!devicesDone) {
        if (HEALTH_PHASE2_ENABLED) {
          setStep("devices");
        } else {
          // Health-device onboarding is parked for Phase 2: skip the step and
          // silently mark it complete so the user is never routed there.
          setStep("done");
          supabase
            .from("profiles")
            .update({ onboarding_completed: true } as any)
            .eq("user_id", user.id)
            .then(undefined, () => {});
        }
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
      setStep("profile");
      return true;
    } catch (error) {
      console.error("Error completing security step:", error);
      return false;
    }
  }, [user]);

  const completeProfileStep = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ profile_setup_completed: true } as any)
        .eq("user_id", user.id);

      if (error) throw error;
      setStep("personalization");
      return true;
    } catch (error) {
      console.error("Error completing profile step:", error);
      return false;
    }
  }, [user]);

  const completePersonalizationStep = useCallback(
    async (personalization?: Record<string, unknown>, extraProfileFields?: Record<string, unknown>): Promise<boolean> => {
      if (!user) return false;

      try {
        const update: Record<string, unknown> = {
          personalization_completed: true,
          ...(extraProfileFields ?? {}),
        };
        if (personalization) update.personalization = personalization;
        // Health-device onboarding is parked for Phase 2: complete it in the
        // same update so the user lands straight in the app with no bounce.
        if (!HEALTH_PHASE2_ENABLED) update.onboarding_completed = true;

        const { error } = await supabase
          .from("profiles")
          .update(update as any)
          .eq("user_id", user.id);

        if (error) throw error;
        setStep(HEALTH_PHASE2_ENABLED ? "devices" : "done");
        return true;
      } catch (error) {
        console.error("Error completing personalization step:", error);
        return false;
      }
    },
    [user],
  );

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
    completeProfileStep,
    completePersonalizationStep,
    completeDevicesStep,
    refetch: fetchStep,
  };
}
