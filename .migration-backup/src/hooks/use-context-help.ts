/**
 * useVYVContextHelp — Micro-tooltip system for first-use sections.
 * Shows a contextual hint ONCE per feature area (e.g. "section:calendar", "btn:focus").
 * Persisted in localStorage so it survives refreshes but never spams.
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "vyv_context_help_v1";

type ContextHelpState = {
  seeded: boolean;
  seen: Record<string, boolean>;
};

const defaultState: ContextHelpState = { seeded: false, seen: {} };

function load(): ContextHelpState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

function persist(s: ContextHelpState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function useVYVContextHelp() {
  const [state, setState] = useState<ContextHelpState>(load);

  useEffect(() => persist(state), [state]);

  /** Seed the system (call once after onboarding completes) */
  const seed = useCallback(() => {
    setState((p) => ({ ...p, seeded: true }));
  }, []);

  /** Should a micro-tooltip be shown for this key? True only once. */
  const shouldShow = useCallback(
    (key: string) => state.seeded && !state.seen[key],
    [state.seeded, state.seen]
  );

  /** Mark a key as shown (will never return true for shouldShow again). */
  const markShown = useCallback((key: string) => {
    setState((p) => ({ ...p, seen: { ...p.seen, [key]: true } }));
  }, []);

  /** Reset all (useful for testing / replay). */
  const reset = useCallback(() => {
    setState(defaultState);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { shouldShow, markShown, seed, isSeeded: state.seeded, reset };
}
