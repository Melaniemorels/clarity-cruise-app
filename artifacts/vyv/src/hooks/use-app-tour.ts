/**
 * useAppTour — Manages the first-time onboarding tour state.
 *
 * Strategy:
 *  1. localStorage key per user-id for instant check (avoids async flash).
 *  2. Profile flag `has_completed_app_tour` for cross-device persistence
 *     (dedicated column — NOT `onboarding_completed`, which belongs to the
 *     profile-setup flow and is already true by the time the tour runs).
 *  3. The tour only ever launches after profile setup is finished
 *     (`onboarding_completed` true).
 *  4. If the user leaves mid-tour, the last step index is kept per user so
 *     the tour resumes where it stopped.
 *  5. Settings → Help → "Replay App Tour" fires a window event that
 *     re-opens the tour from step 0.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

function localKey(userId: string) {
  return `vyv_tour_done_${userId}`;
}

function stepKey(userId: string) {
  return `vyv_tour_step_${userId}`;
}

export const TOUR_REPLAY_EVENT = "vyv:replay-tour";
const REPLAY_INTENT_KEY = "vyv_tour_replay_intent";

/** Ask the app to replay the tour (used from Settings → Help). */
export function requestTourReplay() {
  // One-shot intent flag: survives route transitions in case the Feed
  // listener isn't mounted yet when the event fires.
  try {
    sessionStorage.setItem(REPLAY_INTENT_KEY, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(TOUR_REPLAY_EVENT));
}

export function useAppTour() {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [ready, setReady] = useState(false);
  const [initialStep, setInitialStep] = useState(0);

  useEffect(() => {
    if (!user) {
      setShouldShow(false);
      setReady(true);
      return;
    }

    const key = localKey(user.id);

    const resumeStep = (() => {
      const raw = localStorage.getItem(stepKey(user.id));
      const n = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(n) && n > 0 ? n : 0;
    })();

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

    // Async — check the profile for cross-device sync. The tour only starts
    // once profile setup (`onboarding_completed`) is done.
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("onboarding_completed, has_completed_app_tour")
          .eq("user_id", user.id)
          .single();
        const row = data as {
          onboarding_completed?: boolean;
          has_completed_app_tour?: boolean;
        } | null;
        if (row?.has_completed_app_tour) {
          localStorage.setItem(key, "1");
          setShouldShow(false);
        } else if (row?.onboarding_completed) {
          setInitialStep(resumeStep);
          setShouldShow(true);
        } else {
          // Profile setup not finished yet — never launch the tour early.
          setShouldShow(false);
        }
      } catch {
        setShouldShow(false);
      } finally {
        setReady(true);
      }
    })();
  }, [user]);

  // Settings → Help → "Replay App Tour"
  useEffect(() => {
    if (!user) return;
    const onReplay = () => {
      try {
        sessionStorage.removeItem(REPLAY_INTENT_KEY);
      } catch {
        /* ignore */
      }
      localStorage.removeItem(stepKey(user.id));
      setInitialStep(0);
      setShouldShow(true);
    };
    // Consume a pending replay intent left before this hook mounted
    // (e.g. Settings triggered a navigation to the Feed).
    try {
      if (sessionStorage.getItem(REPLAY_INTENT_KEY) === "1") onReplay();
    } catch {
      /* ignore */
    }
    window.addEventListener(TOUR_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(TOUR_REPLAY_EVENT, onReplay);
  }, [user]);

  /** Persist the current step so a mid-tour exit resumes there. */
  const rememberStep = useCallback(
    (index: number) => {
      if (!user) return;
      try {
        localStorage.setItem(stepKey(user.id), String(index));
      } catch {
        /* ignore */
      }
    },
    [user],
  );

  /** Call once when the user finishes or skips the tour. */
  const markComplete = useCallback(async () => {
    if (!user) return;
    const key = localKey(user.id);
    localStorage.setItem(key, "1");
    localStorage.removeItem(stepKey(user.id));
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
        .update({ has_completed_app_tour: true } as any)
        .eq("user_id", user.id);
    } catch { /* ignore */ }
  }, [user]);

  return { shouldShow, ready, initialStep, rememberStep, markComplete };
}
