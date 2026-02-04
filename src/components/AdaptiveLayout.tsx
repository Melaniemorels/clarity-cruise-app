import { useDevice, useResponsiveFontSize, useResponsiveGrid } from "@/hooks/use-device";
import { cn } from "@/lib/utils";
import React from "react";

interface AdaptiveContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function AdaptiveContainer({ children, className }: AdaptiveContainerProps) {
  const { type, orientation } = useDevice();
  
  return (
    <div
      className={cn(
        "min-h-screen bg-theme-bg transition-all duration-300",
        type === "mobile" && "px-4",
        type === "tablet" && orientation === "portrait" && "px-6",
        type === "tablet" && orientation === "landscape" && "pl-24 pr-6",
        type === "desktop" && "px-8 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

interface AdaptiveHeadingProps {
  level: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
}

export function AdaptiveHeading({ level, children, className }: AdaptiveHeadingProps) {
  const fonts = useResponsiveFontSize();
  
  const sizeClass = level === 1 
    ? fonts.heading1 
    : level === 2 
    ? fonts.heading2 
    : fonts.heading3;
  
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  return (
    <Tag className={cn(sizeClass, "font-bold text-theme-textPrimary transition-all", className)}>
      {children}
    </Tag>
  );
}

interface AdaptiveTextProps {
  variant?: "body" | "small";
  children: React.ReactNode;
  className?: string;
}

export function AdaptiveText({ variant = "body", children, className }: AdaptiveTextProps) {
  const fonts = useResponsiveFontSize();
  const sizeClass = variant === "body" ? fonts.body : fonts.small;
  
  return (
    <p className={cn(sizeClass, "text-theme-textSecondary transition-all", className)}>
      {children}
    </p>
  );
}

interface AdaptiveGridProps {
  children: React.ReactNode;
  className?: string;
}

export function AdaptiveGrid({ children, className }: AdaptiveGridProps) {
  const { columns, gap } = useResponsiveGrid();
  
  return (
    <div
      className={cn(
        "grid transition-all duration-300",
        gap,
        className
      )}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

// Device indicator badge (for development/demo purposes)
export function DeviceIndicator() {
  const { type, orientation, width, height } = useDevice();
  
  return (
    <div className="fixed top-2 right-2 z-50 bg-black/80 text-white text-xs px-2 py-1 rounded-full">
      {type} • {orientation} • {width}×{height}
    </div>
  );
}
