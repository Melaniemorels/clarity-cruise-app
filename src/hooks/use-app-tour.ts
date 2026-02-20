/**
 * useAppTour — Manages the first-time onboarding tour state.
 *
 * Strategy (same as Instagram / Facebook):
 *  1. localStorage key per user-id for instant check (avoids async flash).
 *  2. Supabase profile flag `app_tour_completed` for cross-device persistence.
 *     If the DB flag is true → mark localStorage immediately so we never show
 *     the tour on a new device.
 *
 * Returns `{ shouldShow, markComplete }`.
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

    // Async — check Supabase profile for cross-device sync
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .single();
        const done = (data as any)?.onboarding_completed ?? false;
        if (done) {
          localStorage.setItem(key, "1");
          setShouldShow(false);
        } else {
          setShouldShow(true);
        }
      } catch {
        // On error default to showing tour (better UX than blocking)
        setShouldShow(true);
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

    // Persist to DB so cross-device works (fire-and-forget)
    try {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("user_id", user.id);
    } catch { /* ignore */ }
  }, [user]);

  return { shouldShow, ready, markComplete };
}
