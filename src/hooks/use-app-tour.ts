/**
 * useAppTour — first-time tab spotlight tour (Feed).
 *
 * Important: device/security onboarding uses `profiles.onboarding_completed` separately.
 * This tour must NOT use that flag — otherwise users who finish device onboarding never see the product tour.
 *
 * Persistence: per-user localStorage (+ legacy keys). Optional `profiles.app_tour_completed` when present in DB.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

function localKey(userId: string) {
  return `vyv_tour_done_${userId}`;
}

export function useAppTour() {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setShouldShow(false);
      setReady(true);
      return;
    }

    const key = localKey(user.id);

    // Fast path — localStorage already marked for this user
    if (localStorage.getItem(key) === "1") {
      setShouldShow(false);
      setReady(true);
      return;
    }

    // Also check old tour keys so existing users don't see it again
    const oldSeen = localStorage.getItem("vyv_onboarding_seen");
    const oldGuide = (() => {
      try {
        const raw = localStorage.getItem("vyv_guide_v2");
        if (!raw) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })();
    if (oldSeen === "1" || oldGuide?.firstTourCompleted) {
      localStorage.setItem(key, "1");
      setShouldShow(false);
      setReady(true);
      return;
    }

    // Optional DB sync — column may not exist in all environments
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("app_tour_completed")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        const done = Boolean((data as { app_tour_completed?: boolean } | null)?.app_tour_completed);
        if (done) {
          localStorage.setItem(key, "1");
          setShouldShow(false);
        } else {
          setShouldShow(true);
        }
      } catch {
        // No column or network issue — rely on localStorage only for this session/device
        setShouldShow(localStorage.getItem(key) !== "1");
      } finally {
        setReady(true);
      }
    })();
  }, [user]);

  /** Call once when the user finishes or skips the tour. */
  const markComplete = useCallback(async () => {
    if (!user) return;
    const key = localKey(user.id);
    localStorage.setItem(key, "1");
    // Also patch old keys so nothing else re-triggers
    localStorage.setItem("vyv_onboarding_seen", "1");
    try {
      const oldGuide = localStorage.getItem("vyv_guide_v2");
      const parsed = oldGuide ? JSON.parse(oldGuide) : {};
      parsed.firstTourCompleted = true;
      parsed.tour = { running: false, stepIndex: 0 };
      localStorage.setItem("vyv_guide_v2", JSON.stringify(parsed));
    } catch { /* ignore */ }

    setShouldShow(false);

    try {
      await supabase
        .from("profiles")
        .update({ app_tour_completed: true })
        .eq("user_id", user.id);
    } catch {
      /* app_tour_completed may be missing from schema — localStorage is enough */
    }
  }, [user]);

  return { shouldShow, ready, markComplete };
}
