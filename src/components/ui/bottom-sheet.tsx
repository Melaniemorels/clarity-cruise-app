import * as React from "react";
import { useCallback, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const VELOCITY_THRESHOLD = 400; // px/s
const DRAG_EXPAND_RATIO = 0.25;
const DRAG_CLOSE_RATIO = 0.3;
const DRAG_COLLAPSE_RATIO = 0.3;

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
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [entering, setEntering] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    active: false,
    startY: 0,
    startTranslate: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    fromHandle: false,
    // Track if we've decided this touch is a scroll vs drag
    decided: false,
    isScroll: false,
  });

  const getSnapY = useCallback(
    (state: SnapState) => {
      const h = typeof window !== "undefined" ? window.innerHeight : 800;
      if (state === "collapsed") return h * (1 - collapsedHeight);
      if (state === "expanded") return h * (1 - expandedHeight);
      return h;
    },
    [collapsedHeight, expandedHeight],
  );

  // Animate to a snap position
  const snapTo = useCallback(
    (state: SnapState) => {
      setSnap(state);
      setIsDragging(false);
      setTranslateY(getSnapY(state));
      if (state === "closed") {
        setTimeout(() => onOpenChange(false), 280);
      }
    },
    [getSnapY, onOpenChange],
  );

  // On open → enter from bottom
  useEffect(() => {
    if (open) {
      setEntering(true);
      setSnap("collapsed");
      setTranslateY(window.innerHeight);
      // Next frame: animate to collapsed
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTranslateY(getSnapY("collapsed"));
          setEntering(false);
        });
      });
    }
  }, [open, getSnapY]);

  const isScrollAtTop = () => {
    if (!scrollRef.current) return true;
    return scrollRef.current.scrollTop <= 1;
  };

  // ── Handle drag (pointer events — always draggable) ──
  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const ds = dragState.current;
      ds.active = true;
      ds.fromHandle = true;
      ds.startY = e.clientY;
      ds.startTranslate = getSnapY(snap);
      ds.lastY = e.clientY;
      ds.lastTime = Date.now();
      ds.velocity = 0;
      ds.decided = true;
      ds.isScroll = false;
      setIsDragging(true);
    },
    [snap, getSnapY],
  );

  const onHandlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ds = dragState.current;
      if (!ds.active) return;

      const deltaY = e.clientY - ds.startY;
      let newY = ds.startTranslate + deltaY;

      // Rubber-band above expanded
      const expandedY = getSnapY("expanded");
      if (newY < expandedY) {
        const over = expandedY - newY;
        newY = expandedY - over * 0.12;
      }
      newY = Math.min(newY, window.innerHeight);

      setTranslateY(newY);

      // velocity
      const now = Date.now();
      const dt = now - ds.lastTime;
      if (dt > 0) {
        ds.velocity = ((e.clientY - ds.lastY) / dt) * 1000;
      }
      ds.lastY = e.clientY;
      ds.lastTime = now;
    },
    [getSnapY],
  );

  const resolveSnap = useCallback(
    (currentY: number, v: number) => {
      const collapsedY = getSnapY("collapsed");
      const expandedY = getSnapY("expanded");
      const windowH = window.innerHeight;

      // Fast flick up → expand
      if (v < -VELOCITY_THRESHOLD) {
        snapTo("expanded");
        return;
      }
      // Fast flick down
      if (v > VELOCITY_THRESHOLD) {
        if (snap === "expanded") {
          snapTo("collapsed");
        } else {
          snapTo("closed");
        }
        return;
      }

      // Position-based
      if (snap === "collapsed") {
        const upDist = collapsedY - currentY;
        const upRange = collapsedY - expandedY;
        if (upDist > upRange * DRAG_EXPAND_RATIO) {
          snapTo("expanded");
          return;
        }
        const downDist = currentY - collapsedY;
        const downRange = windowH - collapsedY;
        if (downDist > downRange * DRAG_CLOSE_RATIO) {
          snapTo("closed");
          return;
        }
        snapTo("collapsed");
      } else if (snap === "expanded") {
        const downDist = currentY - expandedY;
        const range = collapsedY - expandedY;
        if (downDist > range * DRAG_COLLAPSE_RATIO) {
          snapTo("collapsed");
        } else {
          snapTo("expanded");
        }
      }
    },
    [snap, getSnapY, snapTo],
  );

  const onHandlePointerUp = useCallback(() => {
    const ds = dragState.current;
    if (!ds.active) return;
    ds.active = false;
    resolveSnap(getSnapY(snap) + (translateY - getSnapY(snap)), ds.velocity);
  }, [resolveSnap, snap, getSnapY, translateY]);

  // ── Content area: touch events for scroll-vs-drag detection ──
  const onContentTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const ds = dragState.current;
      ds.decided = false;
      ds.isScroll = false;
      ds.fromHandle = false;
      ds.startY = e.touches[0].clientY;
      ds.startTranslate = getSnapY(snap);
      ds.lastY = e.touches[0].clientY;
      ds.lastTime = Date.now();
      ds.velocity = 0;
    },
    [snap, getSnapY],
  );

  const onContentTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const ds = dragState.current;
      if (ds.fromHandle) return; // handle takes over
      const touchY = e.touches[0].clientY;
      const deltaY = touchY - ds.startY;

      if (!ds.decided) {
        // Need at least 5px movement to decide
        if (Math.abs(deltaY) < 5) return;
        ds.decided = true;

        // Dragging down while scroll is at top → sheet drag
        if (deltaY > 0 && isScrollAtTop()) {
          ds.isScroll = false;
          ds.active = true;
          setIsDragging(true);
          // Prevent default scrolling
          if (scrollRef.current) {
            scrollRef.current.style.overflowY = "hidden";
          }
        } else {
          // Everything else is a normal scroll
          ds.isScroll = true;
          return;
        }
      }

      if (ds.isScroll) return;
      if (!ds.active) return;

      e.preventDefault();
      let newY = ds.startTranslate + deltaY;
      const expandedY = getSnapY("expanded");
      if (newY < expandedY) {
        const over = expandedY - newY;
        newY = expandedY - over * 0.12;
      }
      newY = Math.min(newY, window.innerHeight);
      setTranslateY(newY);

      const now = Date.now();
      const dt = now - ds.lastTime;
      if (dt > 0) {
        ds.velocity = ((touchY - ds.lastY) / dt) * 1000;
      }
      ds.lastY = touchY;
      ds.lastTime = now;
    },
    [getSnapY],
  );

  const onContentTouchEnd = useCallback(() => {
    const ds = dragState.current;
    // Restore scroll
    if (scrollRef.current) {
      scrollRef.current.style.overflowY = "auto";
    }
    if (!ds.active || ds.isScroll) {
      ds.active = false;
      return;
    }
    ds.active = false;
    resolveSnap(translateY, ds.velocity);
  }, [resolveSnap, translateY]);

  if (!open) return null;

  const backdropOpacity = (() => {
    const expandedY = getSnapY("expanded");
    const windowH = typeof window !== "undefined" ? window.innerHeight : 800;
    const norm = Math.max(0, Math.min(1, (translateY - expandedY) / (windowH - expandedY)));
    return 0.6 - norm * 0.6;
  })();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{
              backgroundColor: `hsl(var(--background) / ${backdropOpacity})`,
              backdropFilter: "blur(4px)",
            }}
            onClick={() => snapTo("closed")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Sheet */}
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border border-border bg-card shadow-2xl",
              "select-none",
              className,
            )}
            style={{
              transform: `translateY(${translateY}px)`,
              transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
              height: `${expandedHeight * 100}dvh`,
              willChange: "transform",
            }}
          >
            {/* Drag Handle */}
            <div
              className="flex-shrink-0 flex items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
            >
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            {header}

            {/* Scrollable content */}
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
              onTouchStart={onContentTouchStart}
              onTouchMove={onContentTouchMove}
              onTouchEnd={onContentTouchEnd}
            >
              {children}
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
