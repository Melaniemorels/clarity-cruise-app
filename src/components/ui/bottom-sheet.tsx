import * as React from "react";
import { useCallback, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

type SnapState = "collapsed" | "expanded" | "closed";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  /** Height fraction for collapsed state (0-1). Default 0.55 */
  collapsedHeight?: number;
  /** Height fraction for expanded state (0-1). Default 0.93 */
  expandedHeight?: number;
  header?: React.ReactNode;
  className?: string;
}

const VELOCITY_THRESHOLD = 300;
const DRAG_UP_THRESHOLD = 0.2;
const DRAG_DOWN_CLOSE_THRESHOLD = 0.3;

export function BottomSheet({
  open,
  onOpenChange,
  children,
  collapsedHeight = 0.55,
  expandedHeight = 0.93,
  header,
  className,
}: BottomSheetProps) {
  const [snap, setSnap] = useState<SnapState>("collapsed");
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startTranslate = useRef(0);
  const currentTranslate = useRef(0);
  const lastTime = useRef(0);
  const lastY = useRef(0);
  const velocity = useRef(0);
  const fromHandle = useRef(false);

  // Spring-driven translateY
  const springY = useSpring(0, { stiffness: 400, damping: 35, mass: 0.8 });
  const backdropOpacity = useTransform(springY, (y) => {
    const windowH = window.innerHeight;
    const collapsedY = windowH * (1 - collapsedHeight);
    const expandedY = windowH * (1 - expandedHeight);
    // Map from expandedY..windowH to 0.6..0
    const norm = Math.max(0, Math.min(1, (y - expandedY) / (windowH - expandedY)));
    return 0.6 - norm * 0.6;
  });

  const getSnapY = useCallback(
    (state: SnapState) => {
      const h = window.innerHeight;
      if (state === "collapsed") return h * (1 - collapsedHeight);
      if (state === "expanded") return h * (1 - expandedHeight);
      return h; // closed
    },
    [collapsedHeight, expandedHeight],
  );

  // Animate to snap
  const animateTo = useCallback(
    (state: SnapState) => {
      setSnap(state);
      springY.set(getSnapY(state));
      if (state === "closed") {
        setTimeout(() => onOpenChange(false), 300);
      }
    },
    [springY, getSnapY, onOpenChange],
  );

  // On open, reset to collapsed
  useEffect(() => {
    if (open) {
      setSnap("collapsed");
      // Start off-screen, then animate in
      springY.jump(window.innerHeight);
      requestAnimationFrame(() => {
        springY.set(getSnapY("collapsed"));
      });
    }
  }, [open, springY, getSnapY]);

  const isScrollAtTop = () => {
    if (!scrollRef.current) return true;
    return scrollRef.current.scrollTop <= 0;
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent, isHandle: boolean) => {
      // Only start drag from handle, or from content when expanded and scroll at top
      if (!isHandle && snap !== "expanded") return;
      if (!isHandle && !isScrollAtTop()) return;

      fromHandle.current = isHandle;
      dragging.current = true;
      startY.current = e.clientY;
      startTranslate.current = springY.get();
      currentTranslate.current = startTranslate.current;
      lastY.current = e.clientY;
      lastTime.current = Date.now();
      velocity.current = 0;

      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [snap, springY],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;

      const deltaY = e.clientY - startY.current;
      let newY = startTranslate.current + deltaY;

      // Clamp: don't go above expanded or below screen
      const expandedY = getSnapY("expanded");
      const maxY = window.innerHeight;
      // Rubber band effect above expanded
      if (newY < expandedY) {
        const over = expandedY - newY;
        newY = expandedY - over * 0.15;
      }
      newY = Math.min(newY, maxY);

      springY.jump(newY);
      currentTranslate.current = newY;

      // Track velocity
      const now = Date.now();
      const dt = now - lastTime.current;
      if (dt > 0) {
        velocity.current = (e.clientY - lastY.current) / dt * 1000;
      }
      lastY.current = e.clientY;
      lastTime.current = now;
    },
    [springY, getSnapY],
  );

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;

    const y = currentTranslate.current;
    const collapsedY = getSnapY("collapsed");
    const expandedY = getSnapY("expanded");
    const windowH = window.innerHeight;
    const v = velocity.current;

    // Fast flick detection
    if (v < -VELOCITY_THRESHOLD) {
      // Flicking up → expand
      animateTo("expanded");
      return;
    }
    if (v > VELOCITY_THRESHOLD) {
      // Flicking down
      if (snap === "expanded") {
        animateTo("collapsed");
      } else {
        animateTo("closed");
      }
      return;
    }

    // Position-based snapping
    if (snap === "collapsed") {
      const dragDistance = collapsedY - y;
      const range = collapsedY - expandedY;
      if (dragDistance > range * DRAG_UP_THRESHOLD) {
        animateTo("expanded");
      } else {
        const downDistance = y - collapsedY;
        const downRange = windowH - collapsedY;
        if (downDistance > downRange * DRAG_DOWN_CLOSE_THRESHOLD) {
          animateTo("closed");
        } else {
          animateTo("collapsed");
        }
      }
    } else if (snap === "expanded") {
      const downDistance = y - expandedY;
      const range = collapsedY - expandedY;
      if (downDistance > range * 0.3) {
        animateTo("collapsed");
      } else {
        animateTo("expanded");
      }
    }
  }, [snap, getSnapY, animateTo]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{
              backgroundColor: "hsl(var(--background) / 0.8)",
              backdropFilter: "blur(4px)",
              opacity: backdropOpacity,
            }}
            onClick={() => animateTo("closed")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border border-border bg-card shadow-2xl",
              "select-none",
              className,
            )}
            style={{
              y: springY,
              height: `${expandedHeight * 100}vh`,
              willChange: "transform",
            }}
          >
            {/* Drag Handle */}
            <div
              className="flex-shrink-0 flex items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => onPointerDown(e, true)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header (non-draggable content) */}
            {header}

            {/* Scrollable content */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{
                touchAction: snap === "expanded" ? "pan-y" : "none",
              }}
              onPointerDown={(e) => {
                if (snap === "expanded" && isScrollAtTop()) {
                  onPointerDown(e, false);
                }
              }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
