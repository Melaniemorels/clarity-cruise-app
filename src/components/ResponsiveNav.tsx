import { useDevice } from "@/hooks/use-device";
import { BottomNav } from "./BottomNav";
import { Home, Compass, Calendar, User, Plus } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ResponsiveNavProps {
  onCreatePost?: () => void;
}

export function ResponsiveNav({ onCreatePost }: ResponsiveNavProps) {
  // Always use bottom nav regardless of device
  return <BottomNav />;
}

function SideNav({ onCreatePost }: { onCreatePost?: () => void }) {
  const location = useLocation();
  
  const navItems = [
    { path: "/", icon: Home, label: "Feed" },
    { path: "/explore", icon: Compass, label: "Explore" },
    { path: "/calendar", icon: Calendar, label: "Calendario" },
    { path: "/profile", icon: User, label: "Perfil" },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-20 bg-theme-cardBg border-r border-border flex flex-col items-center py-6 z-50">
      <div className="flex-1 flex flex-col gap-2 w-full px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
      
      {onCreatePost && (
        <button
          onClick={onCreatePost}
          className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}
    </aside>
  );
}

// Hook to get content padding based on nav type
export function useNavPadding() {
  return "pb-20"; // Always bottom nav padding
}
