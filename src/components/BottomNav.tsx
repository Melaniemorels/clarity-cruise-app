import { useState } from "react";
import { Home, Compass, Lock, Calendar, User } from "lucide-react";
import { NavLink } from "./NavLink";
import { QuickCamera } from "./QuickCamera";

export const BottomNav = () => {
  const [cameraOpen, setCameraOpen] = useState(false);

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
          >
            <Home className="h-6 w-6" strokeWidth={1.4} />
            <span className="text-xs font-medium">Feed</span>
          </NavLink>
          
          <NavLink
            to="/explore"
            className="flex flex-col items-center gap-1 px-4 py-2 transition-colors text-theme-tabIconInactive"
            activeClassName="!text-theme-tabIconActive"
          >
            <Compass className="h-6 w-6" strokeWidth={1.4} />
            <span className="text-xs font-medium">Explore</span>
          </NavLink>
          
          <button
            onClick={() => setCameraOpen(true)}
            className="flex flex-col items-center gap-1 px-4 py-2 transition-colors text-theme-tabIconInactive hover:text-theme-tabIconActive"
          >
            <Lock className="h-6 w-6" strokeWidth={1.4} />
            <span className="text-xs font-medium">Focus</span>
          </button>
        
        <NavLink
          to="/calendar"
          className="flex flex-col items-center gap-1 px-4 py-2 transition-colors text-theme-tabIconInactive"
          activeClassName="!text-theme-tabIconActive"
        >
          <Calendar className="h-6 w-6" strokeWidth={1.4} />
          <span className="text-xs font-medium">Calendar</span>
        </NavLink>
        
          <NavLink
            to="/profile"
            className="flex flex-col items-center gap-1 px-4 py-2 transition-colors text-theme-tabIconInactive"
            activeClassName="!text-theme-tabIconActive"
          >
            <User className="h-6 w-6" strokeWidth={1.4} />
            <span className="text-xs font-medium">Profile</span>
          </NavLink>
        </div>
      </nav>
      
      <QuickCamera isOpen={cameraOpen} onOpenChange={setCameraOpen} />
    </>
  );
};
