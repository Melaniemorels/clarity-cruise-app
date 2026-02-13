import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

/* ────────────────────────────────
 * Types
 * ──────────────────────────────── */
export type AnchorId =
  | "nav_feed"
  | "nav_calendar"
  | "nav_explore"
  | "nav_focus"
  | "nav_profile"
  | "capture_vibe"
  | "profile_privacy"
  | "social_time_bar"
  | "travel_toggle"
  | "language_toggle";

export type FirstTapId =
  | "homeNav"
  | "exploreNav"
  | "focusNav"
  | "calendarNav"
  | "profileNav"
  | "focusCapture"
  | "exploreCard"
  | "addEventBtn"
  | "editProfileBtn"
  | "profileShare";

export type AnchorRect = { x: number; y: number; width: number; height: number };

/* ────────────────────────────────
 * Tour Steps
 * ──────────────────────────────── */
export type TourStep = {
  title: string;
  body: string;
  anchor?: AnchorId;
  route?: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Bienvenida a VYV",
    body: "VYV es tu sistema para vivir con intención. Te muestro lo esencial en 30 segundos.",
  },
  {
    title: "Inicio",
    body: "Tu estado del día: energía, hábitos y dirección. Todo empieza aquí.",
    anchor: "nav_feed",
    route: "/",
  },
  {
    title: "Explorar",
    body: "Recomendaciones alineadas a tu ritmo. Menos ruido, más valor.",
    anchor: "nav_explore",
    route: "/explore",
  },
  {
    title: "Enfoque",
    body: "Tu espacio para presencia. Captura tu momento y vuelve a lo importante.",
    anchor: "nav_focus",
  },
  {
    title: "Calendario",
    body: "Organiza tu vida visualmente. Eventos, ritmo y balance en un solo lugar.",
    anchor: "nav_calendar",
    route: "/calendar",
  },
  {
    title: "Perfil",
    body: "Tu progreso es tuyo. Tú eliges qué compartir y qué guardar en privado.",
    anchor: "nav_profile",
    route: "/profile",
  },
];

/* ────────────────────────────────
 * State
 * ──────────────────────────────── */
type GuideState = {
  firstTourCompleted: boolean;
  firstTapSeen: Record<string, boolean>;
  allowReplayTour: boolean;
  friendsOnboardingCompleted: boolean;
  friendsOnboardingDismissed: boolean;
  tour: { running: boolean; stepIndex: number };
};

const STORAGE_KEY = "vyv_guide_v2";

const defaultFirstTapSeen: Record<FirstTapId, boolean> = {
  homeNav: false,
  exploreNav: false,
  focusNav: false,
  calendarNav: false,
  profileNav: false,
  focusCapture: false,
  exploreCard: false,
  addEventBtn: false,
  editProfileBtn: false,
  profileShare: false,
};

const initialState: GuideState = {
  firstTourCompleted: false,
  firstTapSeen: { ...defaultFirstTapSeen },
  allowReplayTour: true,
  friendsOnboardingCompleted: false,
  friendsOnboardingDismissed: false,
  tour: { running: false, stepIndex: 0 },
};

/* ────────────────────────────────
 * Reducer
 * ──────────────────────────────── */
type Action =
  | { type: "START_TOUR" }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SKIP_TOUR" }
  | { type: "REPLAY_TOUR" }
  | { type: "MARK_FIRST_TAP"; payload: FirstTapId }
  | { type: "FRIENDS_COMPLETED" }
  | { type: "FRIENDS_DISMISSED" }
  | { type: "HYDRATE"; payload: Partial<GuideState> };

function reducer(state: GuideState, action: Action): GuideState {
  switch (action.type) {
    case "START_TOUR":
      if (state.firstTourCompleted) return state;
      return { ...state, tour: { running: true, stepIndex: 0 } };
    case "NEXT_STEP": {
      const next = state.tour.stepIndex + 1;
      if (next >= TOUR_STEPS.length) {
        return { ...state, firstTourCompleted: true, tour: { running: false, stepIndex: 0 } };
      }
      return { ...state, tour: { ...state.tour, stepIndex: next } };
    }
    case "PREV_STEP":
      return { ...state, tour: { ...state.tour, stepIndex: Math.max(0, state.tour.stepIndex - 1) } };
    case "SKIP_TOUR":
      return { ...state, firstTourCompleted: true, tour: { running: false, stepIndex: 0 } };
    case "REPLAY_TOUR":
      return { ...state, firstTourCompleted: false, tour: { running: true, stepIndex: 0 } };
    case "MARK_FIRST_TAP":
      return { ...state, firstTapSeen: { ...state.firstTapSeen, [action.payload]: true } };
    case "FRIENDS_COMPLETED":
      return { ...state, friendsOnboardingCompleted: true };
    case "FRIENDS_DISMISSED":
      return { ...state, friendsOnboardingDismissed: true };
    case "HYDRATE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

/* ────────────────────────────────
 * Helpers
 * ──────────────────────────────── */
function getRect(el: HTMLElement | null): AnchorRect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

/* ────────────────────────────────
 * Context
 * ──────────────────────────────── */
interface GuideContextValue {
  state: GuideState;
  tourSteps: TourStep[];
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  replayTour: () => void;
  markFirstTap: (id: FirstTapId) => void;
  isFirstTap: (id: FirstTapId) => boolean;
  isTourRunning: boolean;
  registerAnchor: (id: AnchorId, el: HTMLElement | null) => void;
  getAnchorRect: (id: AnchorId) => AnchorRect | null;
  sessionTooltipShown: Set<string>;
  markSessionTooltip: (pageKey: string) => void;
  shouldShowFriendsOnboarding: boolean;
  completeFriendsOnboarding: () => void;
  dismissFriendsOnboarding: () => void;
}

const GuideCtx = createContext<GuideContextValue | null>(null);

export function useGuide() {
  const ctx = useContext(GuideCtx);
  if (!ctx) throw new Error("useGuide must be used within GuideProvider");
  return ctx;
}

/* ────────────────────────────────
 * Provider
 * ──────────────────────────────── */
export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const anchorsRef = useRef<Map<AnchorId, HTMLElement>>(new Map());
  const [sessionTooltips] = useState(() => new Set<string>());

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      dispatch({
        type: "HYDRATE",
        payload: {
          firstTourCompleted: parsed.firstTourCompleted ?? false,
          firstTapSeen: { ...defaultFirstTapSeen, ...(parsed.firstTapSeen || {}) },
          allowReplayTour: parsed.allowReplayTour ?? true,
          friendsOnboardingCompleted: parsed.friendsOnboardingCompleted ?? false,
          friendsOnboardingDismissed: parsed.friendsOnboardingDismissed ?? false,
        },
      });
    } catch { /* ignore */ }
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          firstTourCompleted: state.firstTourCompleted,
          firstTapSeen: state.firstTapSeen,
          allowReplayTour: state.allowReplayTour,
          friendsOnboardingCompleted: state.friendsOnboardingCompleted,
          friendsOnboardingDismissed: state.friendsOnboardingDismissed,
        })
      );
    } catch { /* ignore */ }
  }, [state.firstTourCompleted, state.firstTapSeen, state.allowReplayTour]);

  const registerAnchor = useCallback((id: AnchorId, el: HTMLElement | null) => {
    if (!el) anchorsRef.current.delete(id);
    else anchorsRef.current.set(id, el);
  }, []);

  const getAnchorRect = useCallback(
    (id: AnchorId) => getRect(anchorsRef.current.get(id) || null),
    []
  );

  const startTour = useCallback(() => dispatch({ type: "START_TOUR" }), []);
  const nextStep = useCallback(() => dispatch({ type: "NEXT_STEP" }), []);
  const prevStep = useCallback(() => dispatch({ type: "PREV_STEP" }), []);
  const skipTour = useCallback(() => dispatch({ type: "SKIP_TOUR" }), []);
  const replayTour = useCallback(() => dispatch({ type: "REPLAY_TOUR" }), []);
  const markFirstTap = useCallback((id: FirstTapId) => dispatch({ type: "MARK_FIRST_TAP", payload: id }), []);
  const isFirstTap = useCallback((id: FirstTapId) => !state.firstTapSeen[id], [state.firstTapSeen]);
  const markSessionTooltip = useCallback((key: string) => { sessionTooltips.add(key); }, [sessionTooltips]);
  const completeFriendsOnboarding = useCallback(() => dispatch({ type: "FRIENDS_COMPLETED" }), []);
  const dismissFriendsOnboarding = useCallback(() => dispatch({ type: "FRIENDS_DISMISSED" }), []);
  const shouldShowFriendsOnboarding = state.firstTourCompleted && !state.friendsOnboardingCompleted && !state.friendsOnboardingDismissed && !state.tour.running;

  const value = useMemo<GuideContextValue>(
    () => ({
      state,
      tourSteps: TOUR_STEPS,
      startTour,
      nextStep,
      prevStep,
      skipTour,
      replayTour,
      markFirstTap,
      isFirstTap,
      isTourRunning: state.tour.running,
      registerAnchor,
      getAnchorRect,
      sessionTooltipShown: sessionTooltips,
      markSessionTooltip,
      shouldShowFriendsOnboarding,
      completeFriendsOnboarding,
      dismissFriendsOnboarding,
    }),
    [state, startTour, nextStep, prevStep, skipTour, replayTour, markFirstTap, isFirstTap, registerAnchor, getAnchorRect, sessionTooltips, markSessionTooltip, shouldShowFriendsOnboarding, completeFriendsOnboarding, dismissFriendsOnboarding]
  );

  return <GuideCtx.Provider value={value}>{children}</GuideCtx.Provider>;
}

/* ────────────────────────────────
 * Anchor hook
 * ──────────────────────────────── */
export function useGuideAnchor(id: AnchorId) {
  const { registerAnchor } = useGuide();
  return useCallback((el: HTMLElement | null) => registerAnchor(id, el), [registerAnchor, id]);
}

/* ────────────────────────────────
 * Auto-start tour hook
 * ──────────────────────────────── */
export function useAutoStartTour() {
  const { startTour, state } = useGuide();
  useEffect(() => {
    if (state.firstTourCompleted) return;
    const id = setTimeout(() => startTour(), 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
