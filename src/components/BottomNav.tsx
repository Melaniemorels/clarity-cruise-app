import { useState } from "react";
import { Home, Compass, Lock, Calendar, User } from "lucide-react";
import { NavLink } from "./NavLink";
import { QuickCamera } from "./QuickCamera";
import { FocusIntroModal } from "./FocusIntroModal";
import { useTranslation } from "react-i18next";
import { useGuideAnchor, useGuide } from "@/contexts/GuideContext";
import { useOrientation } from "@/hooks/use-orientation";
import { cn } from "@/lib/utils";

export const BottomNav = () => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [focusIntroOpen, setFocusIntroOpen] = useState(false);
  const { t } = useTranslation();
  const { isFirstTap, isTourRunning } = useGuide();
  const orientation = useOrientation();
  const isLandscape = orientation === "landscape";

  const feedAnchor = useGuideAnchor("nav_feed");
  const exploreAnchor = useGuideAnchor("nav_explore");
  const focusAnchor = useGuideAnchor("nav_focus");
  const calendarAnchor = useGuideAnchor("nav_calendar");
  const profileAnchor = useGuideAnchor("nav_profile");

  const handleFocusTap = () => {
    if (isFirstTap("focusNav") && !isTourRunning) {
      setFocusIntroOpen(true);
    } else {
      setCameraOpen(true);
    }
  };

  const linkClass = cn(
    "flex items-center gap-1 transition-colors text-theme-tabIconInactive",
    isLandscape
      ? "flex-row justify-start px-3 py-3 rounded-xl w-full"
      : "flex-col px-4 py-2"
  );

  const activeClass = "!text-theme-tabIconActive";

  return (
    <>
      <nav
        className={cn(
          "fixed z-50 bg-theme-tabBg border-theme-borderSubtle backdrop-blur-xl",
          isLandscape
            ? "left-0 top-0 bottom-0 w-[72px] border-r flex flex-col items-center justify-center"
            : "bottom-0 left-0 right-0 border-t"
        )}
        style={{ boxShadow: "0 0 12px rgba(0,0,0,0.08)" }}
      >
        <div
          className={cn(
            isLandscape
              ? "flex flex-col items-center gap-1 py-4 w-full px-2"
              : "flex items-center justify-around h-16 max-w-lg mx-auto px-4"
          )}
        >
          <NavLink
            to="/"
            end
            id="tab-home"
            className={linkClass}
            activeClassName={activeClass}
            ref={feedAnchor}
          >
            <Home className="h-6 w-6" strokeWidth={1.4} />
            {!isLandscape && <span className="text-xs font-medium">{t("nav.feed")}</span>}
          </NavLink>

          <NavLink
            to="/explore"
            id="tab-explore"
            className={linkClass}
            activeClassName={activeClass}
            ref={exploreAnchor}
          >
            <Compass className="h-6 w-6" strokeWidth={1.4} />
            {!isLandscape && <span className="text-xs font-medium">{t("nav.explore")}</span>}
          </NavLink>

          <button
            id="tab-focus"
            ref={focusAnchor}
            onClick={handleFocusTap}
            className={cn(
              linkClass,
              "hover:text-theme-tabIconActive"
            )}
          >
            <Lock className="h-6 w-6" strokeWidth={1.4} />
            {!isLandscape && <span className="text-xs font-medium">{t("nav.focus")}</span>}
          </button>

          <NavLink
            to="/calendar"
            id="tab-calendar"
            className={linkClass}
            activeClassName={activeClass}
            ref={calendarAnchor}
          >
            <Calendar className="h-6 w-6" strokeWidth={1.4} />
            {!isLandscape && <span className="text-xs font-medium">{t("nav.calendar")}</span>}
          </NavLink>

          <NavLink
            to="/profile"
            id="tab-profile"
            className={linkClass}
            activeClassName={activeClass}
            ref={profileAnchor}
          >
            <User className="h-6 w-6" strokeWidth={1.4} />
            {!isLandscape && <span className="text-xs font-medium">{t("nav.profile")}</span>}
          </NavLink>
        </div>
      </nav>

      <QuickCamera isOpen={cameraOpen} onOpenChange={setCameraOpen} />

      <FocusIntroModal
        open={focusIntroOpen}
        onBegin={() => {
          setFocusIntroOpen(false);
          setCameraOpen(true);
        }}
        onLater={() => setFocusIntroOpen(false)}
      />
    </>
  );
};
