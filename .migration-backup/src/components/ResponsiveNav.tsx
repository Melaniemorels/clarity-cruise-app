import { BottomNav } from "./BottomNav";
import { useDevice } from "@/hooks/use-device";

interface ResponsiveNavProps {
  onCreatePost?: () => void;
}

export function ResponsiveNav({ onCreatePost }: ResponsiveNavProps) {
  return <BottomNav />;
}

// Hook to get content padding based on nav position
// Uses device hook so type doesn't flip on rotation
export function useNavPadding() {
  const device = useDevice();
  if (device.isLandscape) {
    const railWidth = device.isCompactLandscape ? 56 : 72;
    return `pl-[${railWidth}px]`;
  }
  return "pb-20";
}

// CSS variable approach for dynamic padding (more reliable than template literal)
export function useNavStyle(): React.CSSProperties {
  const device = useDevice();
  if (device.isLandscape) {
    const railWidth = device.isCompactLandscape ? 56 : 72;
    return { paddingLeft: `${railWidth}px` };
  }
  return { paddingBottom: "5rem" }; // pb-20
}

import React from "react";
