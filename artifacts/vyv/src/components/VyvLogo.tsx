/**
 * VyvLogo — the single reusable, theme-aware VYV logo mark.
 *
 * Renders the official glyph via a CSS mask so its color adapts
 * automatically to the active theme through the `--vyv-logo` token
 * (defined in index.css for light and dark modes). Geometry is never
 * altered — only color, opacity and subtle depth.
 */
import React from "react";
import { cn } from "@/lib/utils";
import logoMask from "@/assets/vyv-logo-mask.png";

interface VyvLogoProps {
  /** Pixel size (width = height). Ignored if className sets sizes. */
  size?: number;
  className?: string;
  /** Override the fill (any CSS color). Defaults to the theme token. */
  color?: string;
  /** Adds a very soft drop shadow for gentle depth. */
  withShadow?: boolean;
  style?: React.CSSProperties;
  "aria-label"?: string;
}

export default function VyvLogo({
  size,
  className,
  color,
  withShadow = false,
  style,
  ...rest
}: VyvLogoProps) {
  const maskStyles: React.CSSProperties = {
    WebkitMaskImage: `url(${logoMask})`,
    maskImage: `url(${logoMask})`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    backgroundColor: color ?? "hsl(var(--vyv-logo))",
    ...(size ? { width: size, height: size } : {}),
    ...(withShadow
      ? { filter: "drop-shadow(0 2px 6px hsl(var(--vyv-logo) / 0.18))" }
      : {}),
    ...style,
  };

  return (
    <span
      role="img"
      aria-label={rest["aria-label"] ?? "VYV"}
      className={cn("inline-block shrink-0", className)}
      style={maskStyles}
    />
  );
}
