import * as React from "react";

export type DeviceType = "mobile" | "tablet" | "desktop";
export type Orientation = "portrait" | "landscape";

interface DeviceInfo {
  type: DeviceType;
  orientation: Orientation;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  /** True when landscape AND short height (iPhone landscape) */
  isCompactLandscape: boolean;
  /** True on iPad-sized screens */
  isIPad: boolean;
  width: number;
  height: number;
}

const MOBILE_BREAKPOINT = 640;
const TABLET_BREAKPOINT = 1024;
const COMPACT_HEIGHT = 500; // iPhone landscape height threshold

function getDeviceInfo(): DeviceInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const orientation: Orientation = width > height ? "landscape" : "portrait";

  // Use the smaller dimension to classify device so rotation doesn't change type
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);

  let type: DeviceType;
  if (shortSide < MOBILE_BREAKPOINT) {
    type = "mobile";
  } else if (shortSide < TABLET_BREAKPOINT && longSide < 1400) {
    type = "tablet";
  } else {
    type = "desktop";
  }

  const isCompactLandscape = orientation === "landscape" && height < COMPACT_HEIGHT;
  const isIPad = type === "tablet" || (shortSide >= 640 && shortSide <= 1024);

  return {
    type,
    orientation,
    isMobile: type === "mobile",
    isTablet: type === "tablet",
    isDesktop: type === "desktop",
    isPortrait: orientation === "portrait",
    isLandscape: orientation === "landscape",
    isCompactLandscape,
    isIPad,
    width,
    height,
  };
}

export function useDevice(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>(() => {
    if (typeof window === "undefined") {
      return {
        type: "mobile",
        orientation: "portrait",
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isPortrait: true,
        isLandscape: false,
        isCompactLandscape: false,
        isIPad: false,
        width: 375,
        height: 812,
      };
    }
    return getDeviceInfo();
  });

  React.useEffect(() => {
    let raf: number;
    const handleResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setDeviceInfo(getDeviceInfo()));
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", () => {
      // Delay to let browser settle new dimensions
      setTimeout(handleResize, 150);
    });

    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return deviceInfo;
}

// Responsive font size classes based on device
export function useResponsiveFontSize() {
  const { type } = useDevice();

  return {
    heading1: type === "mobile" ? "text-2xl" : type === "tablet" ? "text-3xl" : "text-4xl",
    heading2: type === "mobile" ? "text-xl" : type === "tablet" ? "text-2xl" : "text-3xl",
    heading3: type === "mobile" ? "text-lg" : type === "tablet" ? "text-xl" : "text-2xl",
    body: type === "mobile" ? "text-sm" : type === "tablet" ? "text-base" : "text-base",
    small: type === "mobile" ? "text-xs" : type === "tablet" ? "text-sm" : "text-sm",
  };
}

// Grid columns based on device
export function useResponsiveGrid() {
  const { type, orientation } = useDevice();

  if (type === "mobile") {
    return {
      columns: orientation === "landscape" ? 2 : 1,
      gap: "gap-3",
      cardWidth: "w-full",
    };
  }

  if (type === "tablet") {
    return {
      columns: orientation === "landscape" ? 3 : 2,
      gap: "gap-4",
      cardWidth: "w-full",
    };
  }

  return {
    columns: 4,
    gap: "gap-6",
    cardWidth: "w-full",
  };
}
