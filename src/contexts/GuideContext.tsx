import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

/* ────────────────────────────────
 * Types
 * ──────────────────────────────── */
export type GuideArea = "HOME" | "FEED" | "CALENDAR" | "EXPLORE" | "FOCUS" | "SETTINGS";

export type AnchorId =
  | "nav_feed"
  | "nav_calendar"
  | "nav_explore"
  | "nav_focus"
  | "capture_vibe"
  | "profile_privacy"
  | "social_time_bar"
  | "travel_toggle"
  | "language_toggle";

export type GuideStep = {
  id: string;
  area: GuideArea;
  anchor: AnchorId;
  title: string;
  body: string;
  when?: (ctx: GuideContextSnapshot) => boolean;
};

export type GuideContextSnapshot = {
  travelEnabled?: boolean;
  socialLocked?: boolean;
  firstSession?: boolean;
};

type GuideState = {
  enabled: boolean;
  completed: Record<string, true>;
  active: {
    running: boolean;
    area: GuideArea | null;
    stepIndex: number;
    stepIds: string[];
  };
};

type Action =
  | { type: "ENABLE"; payload: boolean }
  | { type: "MARK_COMPLETED"; payload: { stepId: string } }
  | { type: "START"; payload: { area: GuideArea; stepIds: string[] } }
  | { type: "STOP" }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "RESET_ALL" }
  | { type: "HYDRATE"; payload: { enabled: boolean; completed: Record<string, true> } };

/* ────────────────────────────────
 * Constants
 * ──────────────────────────────── */
const STORAGE_KEY = "vyv_guide_v1";

const initialState: GuideState = {
  enabled: true,
  completed: {},
  active: { running: false, area: null, stepIndex: 0, stepIds: [] },
};

/* ────────────────────────────────
 * Reducer
 * ──────────────────────────────── */
function reducer(state: GuideState, action: Action): GuideState {
  switch (action.type) {
    case "ENABLE":
      return { ...state, enabled: action.payload };
    case "MARK_COMPLETED":
      return { ...state, completed: { ...state.completed, [action.payload.stepId]: true } };
    case "START":
      return {
        ...state,
        active: { running: true, area: action.payload.area, stepIndex: 0, stepIds: action.payload.stepIds },
      };
    case "STOP":
      return { ...state, active: { running: false, area: null, stepIndex: 0, stepIds: [] } };
    case "NEXT": {
      const nextIdx = state.active.stepIndex + 1;
      if (nextIdx >= state.active.stepIds.length) {
        // Mark all steps as completed and stop
        const newCompleted = { ...state.completed };
        state.active.stepIds.forEach((id) => { newCompleted[id] = true; });
        return { ...state, completed: newCompleted, active: { running: false, area: null, stepIndex: 0, stepIds: [] } };
      }
      // Mark current step completed
      const currentStepId = state.active.stepIds[state.active.stepIndex];
      return {
        ...state,
        completed: { ...state.completed, [currentStepId]: true },
        active: { ...state.active, stepIndex: nextIdx },
      };
    }
    case "PREV":
      return { ...state, active: { ...state.active, stepIndex: Math.max(state.active.stepIndex - 1, 0) } };
    case "RESET_ALL":
      return initialState;
    case "HYDRATE":
      return { ...state, enabled: action.payload.enabled, completed: action.payload.completed };
    default:
      return state;
  }
}

/* ────────────────────────────────
 * Anchor helpers
 * ──────────────────────────────── */
export type AnchorRect = { x: number; y: number; width: number; height: number };

function getRect(el: HTMLElement | null): AnchorRect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

/* ────────────────────────────────
 * Default steps
 * ──────────────────────────────── */
const DEFAULT_STEPS: GuideStep[] = [
  {
    id: "home-nav",
    area: "HOME",
    anchor: "nav_calendar",
    title: "Tu día en un vistazo",
    body: "Calendar es tu base: planes, hábitos y ritmo del día.",
  },
  {
    id: "home-focus",
    area: "HOME",
    anchor: "nav_focus",
    title: "Focus sin fricción",
    body: "Activá Focus para bloquear distracciones y avanzar de verdad.",
  },
  {
    id: "home-explore",
    area: "HOME",
    anchor: "nav_explore",
    title: "Explore curado por vos",
    body: "Contenido y recursos que suman, sin ruido.",
  },
  {
    id: "feed-social-time",
    area: "FEED",
    anchor: "social_time_bar",
    title: "Tiempo social inteligente",
    body: "Tu feed funciona por ventanas. Te cuida sin castigarte.",
  },
  {
    id: "feed-capture",
    area: "FEED",
    anchor: "capture_vibe",
    title: "Capture your vibe",
    body: "Una foto rápida para guardar tu momento (y tu registro).",
  },
  {
    id: "settings-travel",
    area: "SETTINGS",
    anchor: "travel_toggle",
    title: "Modo viaje",
    body: "Ajusta horarios y sugerencias a tu zona local. Sin esfuerzo.",
  },
];

/* ────────────────────────────────
 * Context
 * ──────────────────────────────── */
interface GuideContextValue {
  state: GuideState;
  steps: GuideStep[];
  snapshot: GuideContextSnapshot;
  start: (area: GuideArea) => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  setEnabled: (v: boolean) => void;
  resetAll: () => void;
  registerAnchor: (id: AnchorId, el: HTMLElement | null) => void;
  getAnchorRect: (id: AnchorId) => AnchorRect | null;
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
export function GuideProvider({
  children,
  steps = DEFAULT_STEPS,
  snapshot = {},
}: {
  children: React.ReactNode;
  steps?: GuideStep[];
  snapshot?: GuideContextSnapshot;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const anchorsRef = useRef<Map<AnchorId, HTMLElement>>(new Map());

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.enabled === "boolean" && parsed.completed) {
        dispatch({ type: "HYDRATE", payload: { enabled: parsed.enabled, completed: parsed.completed } });
      }
    } catch { /* ignore */ }
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: state.enabled, completed: state.completed }));
    } catch { /* ignore */ }
  }, [state.enabled, state.completed]);

  const registerAnchor = useCallback((id: AnchorId, el: HTMLElement | null) => {
    if (!el) {
      anchorsRef.current.delete(id);
    } else {
      anchorsRef.current.set(id, el);
    }
  }, []);

  const getAnchorRect = useCallback((id: AnchorId) => {
    return getRect(anchorsRef.current.get(id) || null);
  }, []);

  const start = useCallback((area: GuideArea) => {
    if (!state.enabled) return;
    const stepIds = steps
      .filter((s) => s.area === area)
      .filter((s) => !state.completed[s.id])
      .filter((s) => (s.when ? s.when(snapshot) : true))
      .map((s) => s.id);
    if (!stepIds.length) return;
    dispatch({ type: "START", payload: { area, stepIds } });
  }, [state.enabled, state.completed, steps, snapshot]);

  const stop = useCallback(() => {
    // Mark current step as completed before stopping
    if (state.active.running && state.active.stepIds.length > 0) {
      const currentStepId = state.active.stepIds[state.active.stepIndex];
      dispatch({ type: "MARK_COMPLETED", payload: { stepId: currentStepId } });
    }
    dispatch({ type: "STOP" });
  }, [state.active]);

  const next = useCallback(() => dispatch({ type: "NEXT" }), []);
  const prev = useCallback(() => dispatch({ type: "PREV" }), []);
  const setEnabled = useCallback((v: boolean) => dispatch({ type: "ENABLE", payload: v }), []);
  const resetAll = useCallback(() => dispatch({ type: "RESET_ALL" }), []);

  const value = useMemo<GuideContextValue>(
    () => ({ state, steps, snapshot, start, stop, next, prev, setEnabled, resetAll, registerAnchor, getAnchorRect }),
    [state, steps, snapshot, start, stop, next, prev, setEnabled, resetAll, registerAnchor, getAnchorRect]
  );

  return <GuideCtx.Provider value={value}>{children}</GuideCtx.Provider>;
}

/* ────────────────────────────────
 * Hook to attach anchors
 * ──────────────────────────────── */
export function useGuideAnchor(id: AnchorId) {
  const { registerAnchor } = useGuide();
  const refCb = useCallback(
    (el: HTMLElement | null) => registerAnchor(id, el),
    [registerAnchor, id]
  );
  return refCb;
}

/* ────────────────────────────────
 * Auto-start hook
 * ──────────────────────────────── */
export function useAutoStartGuide(area: GuideArea, condition: boolean = true) {
  const { start, state } = useGuide();
  useEffect(() => {
    if (!condition || !state.enabled) return;
    const id = setTimeout(() => start(area), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, condition]);
}
