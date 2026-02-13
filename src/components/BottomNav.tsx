import { useState } from "react";
import { Home, Compass, Lock, Calendar, User } from "lucide-react";
import { NavLink } from "./NavLink";
import { QuickCamera } from "./QuickCamera";
import { useTranslation } from "react-i18next";
import { useGuideAnchor } from "@/contexts/GuideContext";

export const BottomNav = () => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const { t } = useTranslation();

  const feedAnchor = useGuideAnchor("nav_feed");
  const exploreAnchor = useGuideAnchor("nav_explore");
  const focusAnchor = useGuideAnchor("nav_focus");
  const calendarAnchor = useGuideAnchor("nav_calendar");

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 border-t bg-theme-tabBg border-theme-borderSubtle backdrop-blur-xl"
        style={{
          boxShadow: '0 0 12px rgba(0,0,0,0.08)'
        }}
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
          <NavLink
            to="/"
            end
            className="flex flex-col items-center gap-1 px-4 py-2 transition-colors text-theme-tabIconInactive"
            activeClassName="!text-theme-tabIconActive"
            ref={feedAnchor}
          >
            <Home className="h-6 w-6" strokeWidth={1.4} />
            <span className="text-xs font-medium">{t('nav.feed')}</span>
          </NavLink>
          
          <NavLink
            to="/explore"
            className="flex flex-col items-center gap-1 px-4 py-2 transition-colors text-theme-tabIconInactive"
            activeClassName="!text-theme-tabIconActive"
            ref={exploreAnchor}
          >
            <Compass className="h-6 w-6" strokeWidth={1.4} />
            <span className="text-xs font-medium">{t('nav.explore')}</span>
          </NavLink>
          
          <button
            ref={focusAnchor}
            onClick={() => setCameraOpen(true)}
            className="flex flex-col items-center gap-1 px-4 py-2 transition-colors text-theme-tabIconInactive hover:text-theme-tabIconActive"
          >
            <Lock className="h-6 w-6" strokeWidth={1.4} />
            <span className="text-xs font-medium">{t('nav.focus')}</span>
          </button>
        
        <NavLink
          to="/calendar"
          className="flex flex-col items-center gap-1 px-4 py-2 transition-colors text-theme-tabIconInactive"
          activeClassName="!text-theme-tabIconActive"
          ref={calendarAnchor}
        >
          <Calendar className="h-6 w-6" strokeWidth={1.4} />
          <span className="text-xs font-medium">{t('nav.calendar')}</span>
        </NavLink>
        
          <NavLink
            to="/profile"
            className="flex flex-col items-center gap-1 px-4 py-2 transition-colors text-theme-tabIconInactive"
            activeClassName="!text-theme-tabIconActive"
          >
            <User className="h-6 w-6" strokeWidth={1.4} />
            <span className="text-xs font-medium">{t('nav.profile')}</span>
          </NavLink>
        </div>
      </nav>
      
      <QuickCamera isOpen={cameraOpen} onOpenChange={setCameraOpen} />
    </>
  );
};
