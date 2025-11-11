import { Home, Compass, Lock, Calendar, User } from "lucide-react";
import { NavLink } from "./NavLink";

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        <NavLink
          to="/"
          end
          className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          <Home className="h-6 w-6" />
          <span className="text-xs font-medium">Feed</span>
        </NavLink>
        
        <NavLink
          to="/explore"
          className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          <Compass className="h-6 w-6" />
          <span className="text-xs font-medium">Explore</span>
        </NavLink>
        
        <NavLink
          to="/focus"
          className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          <Lock className="h-6 w-6" />
          <span className="text-xs font-medium">Focus</span>
        </NavLink>
        
        <NavLink
          to="/calendar"
          className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-medium">Calendar</span>
        </NavLink>
        
        <NavLink
          to="/profile"
          className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Profile</span>
        </NavLink>
      </div>
    </nav>
  );
};
