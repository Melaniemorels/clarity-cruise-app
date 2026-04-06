import { useEffect, useCallback, useRef } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const TRAVEL_KEYWORDS = [
  // English
  "flight", "hotel", "airport", "travel", "trip", "vacation",
  "check-in", "checkout", "boarding", "layover", "transit",
  // Spanish
  "vuelo", "aeropuerto", "viaje", "hotel", "vacaciones",
  "embarque", "escala", "tránsito", "check-in", "checkout",
];

const DISMISS_KEY = "vyv-travel-suggestion-dismissed";

interface TravelDetectionResult {
  isTravelDetected: boolean;
  reason: "timezone" | "calendar" | null;
  currentTimezone: string;
  homeTimezone: string | null;
  isDismissed: boolean;
  dismiss: () => void;
  activateTravelMode: () => void;
}

export function useTravelDetection(): TravelDetectionResult {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const calendarCheckDone = useRef(false);
  const calendarHasTravel = useRef(false);

  const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const homeTimezone = profile?.home_timezone ?? null;

  // Check if timezone differs from home
  const timezoneChanged = !!(
    homeTimezone &&
    currentTimezone !== homeTimezone
  );

  // Check calendar for travel-related events (once per session)
  useEffect(() => {
    if (!user || calendarCheckDone.current) return;
    calendarCheckDone.current = true;

    const today = format(new Date(), "yyyy-MM-dd");
    const checkCalendar = async () => {
      const { data: events } = await supabase
        .from("calendar_events")
        .select("title, category")
        .eq("user_id", user.id)
        .gte("starts_at", `${today}T00:00:00`)
        .lte("starts_at", `${today}T23:59:59`);

      if (events?.some((e) =>
        TRAVEL_KEYWORDS.some((kw) =>
          e.title.toLowerCase().includes(kw) ||
          e.category.toLowerCase().includes(kw)
        )
      )) {
        calendarHasTravel.current = true;
      }
    };

    checkCalendar();
  }, [user]);

  const alreadyTraveling = profile?.is_traveling ?? false;
  const modeStatus = profile?.travel_mode_status ?? "auto";

  const getDismissKey = () => `${DISMISS_KEY}-${format(new Date(), "yyyy-MM-dd")}`;

  const isDismissed = (() => {
    try {
      return localStorage.getItem(getDismissKey()) === "true";
    } catch {
      return false;
    }
  })();

  const reason: "timezone" | "calendar" | null = timezoneChanged
    ? "timezone"
    : calendarHasTravel.current
    ? "calendar"
    : null;

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(getDismissKey(), "true");
    } catch {
      /* ignore */
    }
  }, []);

  const activateTravelMode = useCallback(() => {
    updateProfile.mutate({
      is_traveling: true,
      current_timezone: currentTimezone,
      travel_detected_reason: reason ?? "manual",
      ...(!homeTimezone ? { home_timezone: currentTimezone } : {}),
    });
    dismiss();
  }, [updateProfile, currentTimezone, homeTimezone, reason, dismiss]);

  if (modeStatus === "off") {
    return {
      isTravelDetected: false,
      reason: null,
      currentTimezone,
      homeTimezone,
      isDismissed: false,
      dismiss: () => {},
      activateTravelMode: () => {},
    };
  }

  const isTravelDetected =
    !alreadyTraveling &&
    !isDismissed &&
    modeStatus === "auto" &&
    (timezoneChanged || calendarHasTravel.current);

  return {
    isTravelDetected,
    reason,
    currentTimezone,
    homeTimezone,
    isDismissed,
    dismiss,
    activateTravelMode,
  };
}
