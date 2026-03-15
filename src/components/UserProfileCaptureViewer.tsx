import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ArrowLeft, Heart } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { usePostLike, type Post } from "@/hooks/use-posts";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface UserProfileCaptureViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posts: Post[];
  initialIndex: number;
}

export function UserProfileCaptureViewer({
  open,
  onOpenChange,
  posts,
  initialIndex,
}: UserProfileCaptureViewerProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const likeMutation = usePostLike();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDraggingY, setIsDraggingY] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  const post = posts[currentIndex] ?? null;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < posts.length - 1;

  const goTo = useCallback((idx: number, dir: number) => {
    setDirection(dir);
    setCurrentIndex(idx);
  }, []);

  // Reset on open/index change
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setDirection(0);
    setDragY(0);
  }, [initialIndex, open]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) goTo(currentIndex - 1, -1);
      if (e.key === "ArrowRight" && hasNext) goTo(currentIndex + 1, 1);
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, currentIndex, hasPrev, hasNext, goTo, onOpenChange]);

  const handleLike = () => {
    if (!user || !post) return;
    likeMutation.mutate({ postId: post.id, hasLiked: post.user_has_liked });
  };

  // Double-tap to like
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!post?.user_has_liked && user && post) {
        likeMutation.mutate({ postId: post.id, hasLiked: false });
      }
    }
    lastTapRef.current = now;
  };

  // Touch: swipe left/right to navigate, swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    setIsDraggingY(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    // If vertical drag is dominant, track it for dismiss gesture
    if (Math.abs(dy) > Math.abs(dx) && dy > 0) {
      setIsDraggingY(true);
      setDragY(Math.max(0, dy));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStartRef.current.x;
    const dy = endY - touchStartRef.current.y;

    // Swipe down to close
    if (isDraggingY && dragY > 120) {
      onOpenChange(false);
      setDragY(0);
      setIsDraggingY(false);
      touchStartRef.current = null;
      return;
    }

    // Horizontal swipe to navigate
    if (!isDraggingY && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && hasNext) goTo(currentIndex + 1, 1);
      if (dx > 0 && hasPrev) goTo(currentIndex - 1, -1);
    }

    setDragY(0);
    setIsDraggingY(false);
    touchStartRef.current = null;
  };

  if (!post) return null;

  const dismissOpacity = isDraggingY ? Math.max(0.3, 1 - dragY / 400) : 1;
  const dismissScale = isDraggingY ? Math.max(0.92, 1 - dragY / 2000) : 1;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "40%" : "-40%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-40%" : "40%",
      opacity: 0,
    }),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-none w-screen h-[100dvh] p-0 gap-0 border-0 rounded-none bg-black [&>button]:hidden"
        style={{ opacity: dismissOpacity }}
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>{t("postViewer.title")}</DialogTitle>
        </VisuallyHidden>

        <div
          className="relative w-full h-full flex flex-col"
          style={{
            transform: isDraggingY
              ? `translateY(${dragY}px) scale(${dismissScale})`
              : undefined,
            transition: isDraggingY ? "none" : "transform 0.3s ease-out",
          }}
        >
          {/* Minimal top bar */}
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-3 py-3 bg-gradient-to-b from-black/50 via-black/20 to-transparent">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/90 hover:bg-white/10 h-9 w-9 shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <ProfileAvatar
                photoUrl={post.profiles?.photo_url || null}
                handle={post.profiles?.handle || ""}
                name={null}
                size="sm"
                className="ring-1 ring-white/20"
              />
              <span className="text-white/90 text-sm font-medium truncate">
                {post.profiles?.handle}
              </span>
            </div>
          </div>

          {/* Image area — edge-to-edge */}
          <div
            className="flex-1 flex items-center justify-center w-full overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleTap}
          >
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                className="w-full h-full flex items-center justify-center"
              >
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt={post.caption || t("calendar.capture")}
                    className="w-full h-full object-contain select-none pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center text-7xl opacity-30">
                    📸
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom gradient overlay + metadata */}
          <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
            <div className="h-48 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-safe">
            <div className="max-w-lg mx-auto space-y-2.5 pb-5">
              {/* Caption */}
              {post.caption && (
                <p className="text-white/90 text-sm leading-relaxed">
                  {post.caption}
                </p>
              )}

              {/* Date */}
              <p className="text-white/40 text-xs tracking-wide">
                {format(parseISO(post.created_at), "d MMM yyyy · HH:mm")}
              </p>

              {/* Like interaction */}
              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  onClick={handleLike}
                  className="flex items-center gap-1.5 active:scale-90 transition-transform"
                >
                  <Heart
                    className={cn(
                      "h-5 w-5 transition-colors duration-200",
                      post.user_has_liked
                        ? "text-red-500 fill-red-500"
                        : "text-white/60"
                    )}
                  />
                  <span className="text-white/50 text-xs tabular-nums">
                    {post.likes_count}
                  </span>
                </button>
              </div>

              {/* Dot indicators */}
              {posts.length > 1 && posts.length <= 12 && (
                <div className="flex justify-center gap-1 pt-1">
                  {posts.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "rounded-full transition-all duration-300",
                        i === currentIndex
                          ? "bg-white w-5 h-1.5"
                          : "bg-white/30 w-1.5 h-1.5"
                      )}
                    />
                  ))}
                </div>
              )}
              {posts.length > 12 && (
                <p className="text-center text-white/40 text-xs tabular-nums">
                  {currentIndex + 1} / {posts.length}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
