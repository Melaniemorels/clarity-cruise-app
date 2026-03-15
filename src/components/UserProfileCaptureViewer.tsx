import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Heart, ImageOff } from "lucide-react";
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
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  // Local optimistic like state
  const [optimisticLikes, setOptimisticLikes] = useState<Map<string, { liked: boolean; count: number }>>(new Map());

  const post = posts[currentIndex] ?? null;

  // Resolve like state: local optimistic > server
  const resolvedLiked = post ? (optimisticLikes.get(post.id)?.liked ?? post.user_has_liked) : false;
  const resolvedCount = post ? (optimisticLikes.get(post.id)?.count ?? post.likes_count ?? 0) : 0;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < posts.length - 1;

  const goTo = useCallback((idx: number, dir: number) => {
    setDirection(dir);
    setCurrentIndex(idx);
    setImageLoading(true);
    setImageError(false);
  }, []);

  // Reset on open/index change
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setDirection(0);
    setDragY(0);
    setImageLoading(true);
    setImageError(false);
    setOptimisticLikes(new Map());
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
        className="max-w-none w-screen h-[100dvh] p-0 gap-0 border-0 rounded-none [&>button]:hidden flex items-center justify-center"
        style={{ opacity: dismissOpacity, background: "#0A0A0A" }}
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
            transition: isDraggingY ? "none" : "transform 0.35s cubic-bezier(0.32,0.72,0,1)",
          }}
        >
          {/* Minimal top bar — ultra-quiet */}
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 pt-[env(safe-area-inset-top,12px)] pb-3">
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white/80 hover:text-white hover:bg-white/[0.06] h-8 w-8 shrink-0 rounded-full transition-all duration-200"
              onClick={() => onOpenChange(false)}
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </Button>
            <div className="relative flex items-center gap-2.5 min-w-0">
              <ProfileAvatar
                photoUrl={post.profiles?.photo_url || null}
                handle={post.profiles?.handle || ""}
                name={null}
                size="sm"
                className="ring-1 ring-white/10 h-7 w-7"
              />
              <span className="text-white/70 text-[13px] font-normal tracking-wide truncate">
                {post.profiles?.handle}
              </span>
            </div>
          </div>

          {/* Image area — edge-to-edge, centered */}
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
                transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
                className="w-full h-full flex items-center justify-center px-0 sm:px-8 md:px-16"
              >
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt={post.caption || t("calendar.capture")}
                    className="max-w-full max-h-full object-contain select-none pointer-events-none rounded-sm"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full aspect-square max-w-md flex items-center justify-center text-6xl opacity-20">
                    📸
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom gradient — softer, taller */}
          <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
            <div className="h-56 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </div>

          {/* Bottom metadata — quiet and elegant */}
          <div className="absolute bottom-0 left-0 right-0 z-30 px-5 pb-safe">
            <div className="max-w-md mx-auto space-y-3 pb-6">
              {/* Caption */}
              {post.caption && (
                <p className="text-white/80 text-[13px] leading-[1.6] font-light tracking-wide">
                  {post.caption}
                </p>
              )}

              {/* Date — very subtle */}
              <p className="text-white/30 text-[11px] tracking-widest uppercase font-light">
                {format(parseISO(post.created_at), "d MMM yyyy · HH:mm")}
              </p>

              {/* Like — minimal */}
              <div className="flex items-center gap-2 pointer-events-auto pt-0.5">
                <button
                  onClick={handleLike}
                  className="flex items-center gap-1.5 active:scale-90 transition-transform duration-150"
                >
                  <Heart
                    className={cn(
                      "h-[18px] w-[18px] transition-all duration-250",
                      post.user_has_liked
                        ? "text-red-400 fill-red-400"
                        : "text-white/35 hover:text-white/50"
                    )}
                  />
                  {(post.likes_count ?? 0) > 0 && (
                    <span className="text-white/35 text-[11px] tabular-nums font-light">
                      {post.likes_count}
                    </span>
                  )}
                </button>
              </div>

              {/* Dot indicators — softer */}
              {posts.length > 1 && posts.length <= 12 && (
                <div className="flex justify-center gap-[5px] pt-2">
                  {posts.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "rounded-full transition-all duration-400 ease-out",
                        i === currentIndex
                          ? "bg-white/70 w-4 h-[3px]"
                          : "bg-white/15 w-[5px] h-[3px]"
                      )}
                    />
                  ))}
                </div>
              )}
              {posts.length > 12 && (
                <p className="text-center text-white/25 text-[11px] tabular-nums tracking-widest font-light">
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
