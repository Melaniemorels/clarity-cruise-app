import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ProfileAvatarProps {
  photoUrl: string | null | undefined;
  handle: string | null | undefined;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
  xl: "h-24 w-24 text-4xl",
};

/**
 * Adds cache-busting query param to avatar URL if needed.
 * This ensures avatar updates are reflected immediately.
 */
function getCacheBustedUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  
  // If URL already has a cache-busting param, return as-is
  if (url.includes('?v=') || url.includes('&v=')) {
    return url;
  }
  
  return url;
}

/**
 * Get initials for fallback display
 */
function getInitials(handle: string | null | undefined, name?: string | null): string {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }
  
  if (handle) {
    return handle.charAt(0).toUpperCase();
  }
  
  return "?";
}

export function ProfileAvatar({
  photoUrl,
  handle,
  name,
  size = "md",
  className,
  onClick,
}: ProfileAvatarProps) {
  const sizeClass = sizeClasses[size];
  const initials = getInitials(handle, name);
  const imageUrl = getCacheBustedUrl(photoUrl);

  return (
    <Avatar 
      className={cn(sizeClass, onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      <AvatarImage 
        src={imageUrl} 
        alt={handle || "Profile"} 
        className="object-cover"
      />
      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
