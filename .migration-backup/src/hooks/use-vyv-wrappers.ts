/**
 * Thin wrappers over VYVContext for backward compatibility.
 * These re-export the unified state through the same API
 * that existing components expect.
 */
import { useCallback } from "react";
import { useVYV } from "@/contexts/VYVContext";
import type { VYVState, AIMessage, Area } from "@/contexts/VYVContext";

/* ────────────────────────────────
 * Social Budget wrapper
 * ──────────────────────────────── */
export function useVYVSocialBudget() {
  const { state, derived, dispatch } = useVYV();

  const startTracking = useCallback(() => {
    dispatch({ type: "SOCIAL/SESSION_START" });
  }, [dispatch]);

  const stopTracking = useCallback(() => {
    dispatch({ type: "SOCIAL/SESSION_STOP" });
  }, [dispatch]);

  const addExtension = useCallback(() => {
    dispatch({ type: "SOCIAL/EXTEND" });
  }, [dispatch]);

  return {
    usedMinutes: state.social.usedMinutes,
    usedSeconds: state.social.usedSeconds,
    isLocked: state.social.isLocked,
    lockedUntil: state.social.lockedUntil,
    extensionsUsed: state.social.extensionsUsed,
    dailyLimitMinutes: derived.effectiveDailyLimitMinutes,
    totalLimitMinutes: derived.totalLimitWithExtensionsMinutes,
    remainingSeconds: derived.remainingSeconds,
    progressPercent: derived.progressPercent,
    isLimitReached: derived.isLimitReached,
    canExtend: derived.canExtend,
    isQuietHours: derived.isQuietHours,
    isSessionActive: !!state.social.sessionStartedAt,
    startTracking,
    stopTracking,
    addExtension,
  };
}

/* ────────────────────────────────
 * Travel Mode wrapper
 * ──────────────────────────────── */
export function useVYVTravelMode() {
  const { state, dispatch } = useVYV();

  const setTravelMode = useCallback(
    (enabled: boolean, reason?: VYVState["travelMode"]["detectedReason"]) => {
      dispatch({ type: "TRAVEL/SET", payload: { enabled, reason } });
    },
    [dispatch]
  );

  return {
    enabled: state.travelMode.enabled,
    since: state.travelMode.since,
    detectedReason: state.travelMode.detectedReason,
    lastHomeTimezone: state.travelMode.lastHomeTimezone,
    currentTimezone: state.device.timezone,
    policy: state.travelPolicy,
    setTravelMode,
  };
}

/* ────────────────────────────────
 * AI Messages wrapper
 * ──────────────────────────────── */
export function useVYVAI() {
  const { state, dispatch } = useVYV();

  const setMessages = useCallback(
    (messages: AIMessage[]) => {
      dispatch({
        type: "AI/SET_MESSAGES",
        payload: { at: Date.now(), messages },
      });
    },
    [dispatch]
  );

  const clearMessages = useCallback(() => {
    dispatch({ type: "AI/CLEAR" });
  }, [dispatch]);

  const getMessagesByArea = useCallback(
    (area: Area) => state.ai.messages.filter((m) => m.relatedArea === area),
    [state.ai.messages]
  );

  return {
    messages: state.ai.messages,
    lastRunAt: state.ai.lastRunAt,
    setMessages,
    clearMessages,
    getMessagesByArea,
  };
}

/* ────────────────────────────────
 * Focus Session wrapper (stub — functional)
 * ──────────────────────────────── */
export function useVYVFocus() {
  const { state, dispatch } = useVYV();

  const startFocus = useCallback(
    (intent?: string) => {
      dispatch({ type: "FOCUS/START", payload: { intent } });
    },
    [dispatch]
  );

  const stopFocus = useCallback(() => {
    dispatch({ type: "FOCUS/STOP" });
  }, [dispatch]);

  return {
    isActive: state.focus.isActive,
    startedAt: state.focus.startedAt,
    intent: state.focus.intent,
    startFocus,
    stopFocus,
  };
}

/* ────────────────────────────────
 * Device Context wrapper
 * ──────────────────────────────── */
export function useVYVDevice() {
  const { state } = useVYV();
  return state.device;
}
