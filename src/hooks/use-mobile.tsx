import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/** Viewports ≥768px — used for centered settings dialog vs bottom sheet. */
export function useIsDesktop() {
  const [desktop, setDesktop] = React.useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`).matches
      : false,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = () => setDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return desktop;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
