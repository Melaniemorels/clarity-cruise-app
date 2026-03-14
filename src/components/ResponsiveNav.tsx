import { BottomNav } from "./BottomNav";
import { useOrientation } from "@/hooks/use-orientation";

interface ResponsiveNavProps {
  onCreatePost?: () => void;
}

export function ResponsiveNav({ onCreatePost }: ResponsiveNavProps) {
  return <BottomNav />;
}

// Hook to get content padding based on nav position (bottom in portrait, left in landscape)
export function useNavPadding() {
  const orientation = useOrientation();
  return orientation === "landscape" ? "pl-[72px]" : "pb-20";
}
