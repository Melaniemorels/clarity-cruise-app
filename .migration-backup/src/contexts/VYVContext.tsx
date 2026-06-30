import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { useFeedSettings, useTodayTimeUsage } from "@/hooks/use-social-budget";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

/* ────────────────────────────────
 * Types
 * ──────────────────────────────── */
export type Area = "SOCIAL" | "FOCUS" | "CALENDAR" | "EXPLORE" | "SETTINGS";

export type SocialPolicy = {
  dailyWindowMinutes: number;
  extensionMinutes: number;
  maxExtensionsPerDay: number;
  cooldownMinutesAfterLock: number;
  lockSocialOnly: true;
};

export type QuietHours = { startLocalHHmm: string; endLocalHHmm: string };

export type TravelPolicy = {
  autoDetect: boolean;
  jetLagBufferDays: number;
  quietHours: QuietHours;
  socialWindowMultiplier: number;
};

export type FocusSession = {
  isActive: boolean;
  startedAt: number | null;
  intent?: string;
};

export type CalendarContext = {
  nextEventAt?: number | null;
  nextEventTitle?: string;
};

export type DeviceContext = {
  timezone: string;
  tzOffsetMinutes: number;
  approxLat?: number | null;
  approxLng?: number | null;
};

export type AIMessage = {
  id: string;
  at: number;
  kind: "NUDGE" | "WARNING" | "TIP";
  title: string;
  body: string;
  relatedArea?: Area;
};

export type VYVState = {
  socialPolicy: SocialPolicy;
  travelPolicy: TravelPolicy;
  device: DeviceContext;
  travelMode: {
    enabled: boolean;
    since: number | null;
    detectedReason?: "TIMEZONE_CHANGE" | "LOCATION_CHANGE" | "MANUAL";
    lastHomeTimezone?: string | null;
  };
  social: {
    todayDateKey: string;
    usedMinutes: number;
    usedSeconds: number;
    isLocked: boolean;
    lockedUntil?: number | null;
    extensionsUsed: number;
    sessionStartedAt?: number | null;
  };
  focus: FocusSession;
  calendar: CalendarContext;
  ai: {
    lastRunAt: number | null;
    messages: AIMessage[];
  };
};

export type Action =
  | { type: "DEVICE/UPDATE"; payload: Partial<DeviceContext> }
  | { type: "TRAVEL/SET"; payload: { enabled: boolean; reason: VYVState["travelMode"]["detectedReason"] } }
  | { type: "SOCIAL/SESSION_START" }
  | { type: "SOCIAL/SESSION_STOP" }
  | { type: "SOCIAL/TICK_MINUTE" }
  | { type: "SOCIAL/EXTEND" }
  | { type: "SOCIAL/SYNC_FROM_SERVER"; payload: { usedSeconds: number } }
  | { type: "SOCIAL/RESET_DAY"; payload: { dateKey: string } }
  | { type: "SOCIAL/UPDATE_POLICY"; payload: Partial<SocialPolicy> }
  | { type: "TRAVEL/UPDATE_POLICY"; payload: Partial<TravelPolicy> }
  | { type: "FOCUS/START"; payload?: { intent?: string } }
  | { type: "FOCUS/STOP" }
  | { type: "CALENDAR/SET_NEXT"; payload: CalendarContext }
  | { type: "AI/SET_MESSAGES"; payload: { at: number; messages: AIMessage[] } }
  | { type: "AI/CLEAR" };

/* ────────────────────────────────
 * Helpers
 * ──────────────────────────────── */
function localDateKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseHHmm(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

export function isWithinQuietHours(now: Date, quiet: QuietHours): boolean {
  const { h: sh, m: sm } = parseHHmm(quiet.startLocalHHmm);
  const { h: eh, m: em } = parseHHmm(quiet.endLocalHHmm);
  const start = new Date(now);
  start.setHours(sh, sm, 0, 0);
  const end = new Date(now);
  end.setHours(eh, em, 0, 0);

  if (end <= start) {
    const midnight = new Date(now);
    midnight.setHours(23, 59, 59, 999);
    const morningEnd = new Date(now);
    morningEnd.setHours(eh, em, 0, 0);
    const morningStart = new Date(now);
    morningStart.setHours(0, 0, 0, 0);
    return (now >= start && now <= midnight) || (now >= morningStart && now <= morningEnd);
  }
  return now >= start && now <= end;
}

/* ────────────────────────────────
 * Initial State
 * ──────────────────────────────── */
const initialState: VYVState = {
  socialPolicy: {
    dailyWindowMinutes: 15,
    extensionMinutes: 5,
    maxExtensionsPerDay: 2,
    cooldownMinutesAfterLock: 60,
    lockSocialOnly: true,
  },
  travelPolicy: {
    autoDetect: true,
    jetLagBufferDays: 2,
    quietHours: { startLocalHHmm: "22:00", endLocalHHmm: "07:00" },
    socialWindowMultiplier: 0.8,
  },
  device: {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    tzOffsetMinutes: new Date().getTimezoneOffset(),
    approxLat: null,
    approxLng: null,
  },
  travelMode: {
    enabled: false,
    since: null,
    detectedReason: undefined,
    lastHomeTimezone: null,
  },
  social: {
    todayDateKey: localDateKey(),
    usedMinutes: 0,
    usedSeconds: 0,
    isLocked: false,
    lockedUntil: null,
    extensionsUsed: 0,
    sessionStartedAt: null,
  },
  focus: {
    isActive: false,
    startedAt: null,
  },
  calendar: {},
  ai: {
    lastRunAt: null,
    messages: [],
  },
};

/* ────────────────────────────────
 * Reducer
 * ──────────────────────────────── */
function reducer(state: VYVState, action: Action): VYVState {
  switch (action.type) {
    case "DEVICE/UPDATE":
      return { ...state, device: { ...state.device, ...action.payload } };

    case "TRAVEL/SET": {
      const enabled = action.payload.enabled;
      return {
        ...state,
        travelMode: {
          ...state.travelMode,
          enabled,
          since: enabled ? Date.now() : null,
          detectedReason: action.payload.reason,
          lastHomeTimezone: enabled
            ? (state.travelMode.lastHomeTimezone ?? state.device.timezone)
            : state.travelMode.lastHomeTimezone,
        },
      };
    }

    case "SOCIAL/RESET_DAY":
      return {
        ...state,
        social: {
          todayDateKey: action.payload.dateKey,
          usedMinutes: 0,
          usedSeconds: 0,
          isLocked: false,
          lockedUntil: null,
          extensionsUsed: 0,
          sessionStartedAt: null,
        },
      };

    case "SOCIAL/SESSION_START":
      return {
        ...state,
        social: { ...state.social, sessionStartedAt: Date.now() },
      };

    case "SOCIAL/SESSION_STOP":
      return {
        ...state,
        social: { ...state.social, sessionStartedAt: null },
      };

    case "SOCIAL/TICK_MINUTE": {
      const newUsedSeconds = state.social.usedSeconds + 1;
      const newUsedMinutes = Math.floor(newUsedSeconds / 60);

      // Calculate effective daily limit (with travel multiplier)
      const baseLimit = state.socialPolicy.dailyWindowMinutes;
      const travelMultiplier = state.travelMode.enabled
        ? state.travelPolicy.socialWindowMultiplier
        : 1;
      const effectiveLimit = Math.round(baseLimit * travelMultiplier);
      const totalLimitWithExtensions =
        effectiveLimit + state.social.extensionsUsed * state.socialPolicy.extensionMinutes;

      const shouldLock =
        effectiveLimit > 0 && newUsedMinutes >= totalLimitWithExtensions;

      return {
        ...state,
        social: {
          ...state.social,
          usedSeconds: newUsedSeconds,
          usedMinutes: newUsedMinutes,
          isLocked: shouldLock,
          lockedUntil: shouldLock
            ? Date.now() + state.socialPolicy.cooldownMinutesAfterLock * 60_000
            : state.social.lockedUntil,
        },
      };
    }

    case "SOCIAL/EXTEND": {
      if (state.social.extensionsUsed >= state.socialPolicy.maxExtensionsPerDay) {
        return state;
      }
      return {
        ...state,
        social: {
          ...state.social,
          extensionsUsed: state.social.extensionsUsed + 1,
          isLocked: false,
          lockedUntil: null,
        },
      };
    }

    case "SOCIAL/SYNC_FROM_SERVER":
      return {
        ...state,
        social: {
          ...state.social,
          usedSeconds: action.payload.usedSeconds,
          usedMinutes: Math.floor(action.payload.usedSeconds / 60),
        },
      };

    case "SOCIAL/UPDATE_POLICY":
      return {
        ...state,
        socialPolicy: { ...state.socialPolicy, ...action.payload },
      };

    case "TRAVEL/UPDATE_POLICY":
      return {
        ...state,
        travelPolicy: { ...state.travelPolicy, ...action.payload },
      };

    case "FOCUS/START":
      return {
        ...state,
        focus: {
          isActive: true,
          startedAt: Date.now(),
          intent: action.payload?.intent,
        },
      };

    case "FOCUS/STOP":
      return {
        ...state,
        focus: { isActive: false, startedAt: null },
      };

    case "CALENDAR/SET_NEXT":
      return { ...state, calendar: action.payload };

    case "AI/SET_MESSAGES":
      return {
        ...state,
        ai: {
          lastRunAt: action.payload.at,
          messages: action.payload.messages,
        },
      };

    case "AI/CLEAR":
      return { ...state, ai: { lastRunAt: null, messages: [] } };

    default:
      return state;
  }
}

/* ────────────────────────────────
 * Derived selectors
 * ──────────────────────────────── */
export interface VYVDerived {
  effectiveDailyLimitMinutes: number;
  totalLimitWithExtensionsMinutes: number;
  remainingSeconds: number;
  progressPercent: number;
  isLimitReached: boolean;
  canExtend: boolean;
  isQuietHours: boolean;
}

function computeDerived(state: VYVState): VYVDerived {
  const baseLimit = state.socialPolicy.dailyWindowMinutes;
  const travelMultiplier = state.travelMode.enabled
    ? state.travelPolicy.socialWindowMultiplier
    : 1;
  const effectiveLimit = Math.round(baseLimit * travelMultiplier);
  const totalLimitWithExtensions =
    effectiveLimit + state.social.extensionsUsed * state.socialPolicy.extensionMinutes;

  const totalLimitSeconds = effectiveLimit === 0 ? Infinity : totalLimitWithExtensions * 60;
  const remainingSeconds = Math.max(0, totalLimitSeconds - state.social.usedSeconds);
  const progressPercent =
    totalLimitSeconds === Infinity
      ? 0
      : Math.min(100, (state.social.usedSeconds / (effectiveLimit * 60)) * 100);
  const isLimitReached = totalLimitSeconds !== Infinity && state.social.usedSeconds >= totalLimitSeconds;
  const canExtend = state.social.extensionsUsed < state.socialPolicy.maxExtensionsPerDay;
  const isQuietHours = isWithinQuietHours(new Date(), state.travelPolicy.quietHours);

  return {
    effectiveDailyLimitMinutes: effectiveLimit,
    totalLimitWithExtensionsMinutes: totalLimitWithExtensions,
    remainingSeconds,
    progressPercent,
    isLimitReached,
    canExtend,
    isQuietHours,
  };
}

/* ────────────────────────────────
 * Context
 * ──────────────────────────────── */
interface VYVContextValue {
  state: VYVState;
  derived: VYVDerived;
  dispatch: React.Dispatch<Action>;
}

const VYVCtx = createContext<VYVContextValue | null>(null);

export function useVYV(): VYVContextValue {
  const ctx = useContext(VYVCtx);
  if (!ctx) throw new Error("useVYV must be used within VYVProvider");
  return ctx;
}

/* ────────────────────────────────
 * Provider
 * ──────────────────────────────── */
export function VYVProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { data: profile } = useProfile();
  const { data: feedSettings } = useFeedSettings();
  const { data: timeUsage } = useTodayTimeUsage();

  // Sync social policy from DB
  useEffect(() => {
    if (feedSettings) {
      dispatch({
        type: "SOCIAL/UPDATE_POLICY",
        payload: { dailyWindowMinutes: feedSettings.daily_feed_minutes ?? 15 },
      });
    }
  }, [feedSettings]);

  // Sync used seconds from server
  useEffect(() => {
    if (timeUsage) {
      dispatch({
        type: "SOCIAL/SYNC_FROM_SERVER",
        payload: { usedSeconds: timeUsage.seconds_used },
      });
    }
  }, [timeUsage]);

  // Sync travel mode from profile
  useEffect(() => {
    if (profile) {
      const travelEnabled = profile.is_traveling;
      const reason = profile.travel_detected_reason;
      let mappedReason: VYVState["travelMode"]["detectedReason"] = undefined;
      if (reason === "timezone") mappedReason = "TIMEZONE_CHANGE";
      else if (reason === "calendar") mappedReason = "LOCATION_CHANGE";
      else if (reason === "manual") mappedReason = "MANUAL";

      dispatch({
        type: "TRAVEL/SET",
        payload: { enabled: travelEnabled, reason: mappedReason },
      });

      // Sync travel policy multiplier from intensity
      const intensity = profile.travel_intensity ?? "medium";
      const multiplier = intensity === "low" ? 0.6 : intensity === "high" ? 0.9 : 0.8;
      dispatch({
        type: "TRAVEL/UPDATE_POLICY",
        payload: { socialWindowMultiplier: multiplier },
      });
    }
  }, [profile]);

  // Device context — detect timezone changes
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    dispatch({
      type: "DEVICE/UPDATE",
      payload: {
        timezone: tz,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      },
    });
  }, []);

  // Day reset check
  useEffect(() => {
    const interval = setInterval(() => {
      const today = localDateKey();
      if (today !== state.social.todayDateKey) {
        dispatch({ type: "SOCIAL/RESET_DAY", payload: { dateKey: today } });
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [state.social.todayDateKey]);

  const derived = useMemo(() => computeDerived(state), [state]);

  const value = useMemo<VYVContextValue>(
    () => ({ state, derived, dispatch }),
    [state, derived]
  );

  return <VYVCtx.Provider value={value}>{children}</VYVCtx.Provider>;
}
