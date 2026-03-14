import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { X, ChevronLeft, ChevronRight, Heart, ZoomIn, ZoomOut } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { usePostLike, type Post } from "@/hooks/use-posts";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ImmersivePostViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posts: Post[];
  initialIndex: number;
}

export function ImmersivePostViewer({
  open,
  onOpenChange,
  posts,
  initialIndex,
}: ImmersivePostViewerProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const likeMutation = usePostLike();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

  // Reset state when opening or changing index
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomed(false);
    setTranslate({ x: 0, y: 0 });
  }, [initialIndex, open]);

  const post = posts[currentIndex];
  if (!post) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < posts.length - 1;

  const goTo = (idx: number) => {
    setCurrentIndex(idx);
    setZoomed(false);
    setTranslate({ x: 0, y: 0 });
  };

  const handleLike = () => {
    if (!user) return;
    likeMutation.mutate({ postId: post.id, hasLiked: post.user_has_liked });
  };

  const handleDoubleTap = useCallback(() => {
    if (!post.user_has_liked && user) {
      likeMutation.mutate({ postId: post.id, hasLiked: false });
    }
    setZoomed((z) => !z);
    setTranslate({ x: 0, y: 0 });
  }, [post, user, likeMutation]);

  const toggleZoom = () => {
    setZoomed((z) => !z);
    setTranslate({ x: 0, y: 0 });
  };

  // Touch/drag for panned zoom
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!zoomed) return;
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!zoomed || !dragStart) return;
    setTranslate({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => setDragStart(null);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) goTo(currentIndex - 1);
      if (e.key === "ArrowRight" && hasNext) goTo(currentIndex + 1);
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, currentIndex, hasPrev, hasNext]);

  // Swipe support
  const touchStartRef = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoomed) return;
    touchStartRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (zoomed || touchStartRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartRef.current;
    if (Math.abs(diff) > 60) {
      if (diff < 0 && hasNext) goTo(currentIndex + 1);
      if (diff > 0 && hasPrev) goTo(currentIndex - 1);
    }
    touchStartRef.current = null;
  };

  const handleProfileTap = () => {
    onOpenChange(false);
    if (post.user_id === user?.id) {
      navigate("/profile");
    } else {
      navigate(`/profile/${post.user_id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-none w-screen h-[100dvh] p-0 gap-0 border-0 rounded-none bg-black/95 backdrop-blur-xl [&>button]:hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>{t("postViewer.title")}</DialogTitle>
        </VisuallyHidden>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
          <button
            onClick={handleProfileTap}
            className="flex items-center gap-2.5 active:opacity-70 transition-opacity"
          >
            <ProfileAvatar
              photoUrl={post.profiles?.photo_url || null}
              handle={post.profiles?.handle || ""}
              name={null}
              size="sm"
              className="ring-1 ring-white/30"
            />
            <span className="text-white text-sm font-semibold">
              @{post.profiles?.handle}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-9 w-9"
              onClick={toggleZoom}
            >
              {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-9 w-9"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main image area */}
        <div
          className="flex-1 flex items-center justify-center w-full h-full overflow-hidden select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleTap}
        >
          {post.image_url ? (
            <div
              ref={imageRef}
              className={cn(
                "transition-transform duration-300 ease-out cursor-grab active:cursor-grabbing",
                zoomed && "scale-[2.5]"
              )}
              style={
                zoomed
                  ? { transform: `scale(2.5) translate(${translate.x / 2.5}px, ${translate.y / 2.5}px)` }
                  : undefined
              }
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <img
                src={post.image_url}
                alt={post.caption || t("calendar.capture")}
                className="max-h-[80dvh] max-w-full object-contain pointer-events-none"
                draggable={false}
              />
            </div>
          ) : (
            <div className="w-full max-w-sm aspect-square flex items-center justify-center text-7xl bg-white/5 rounded-2xl">
              📸
            </div>
          )}
        </div>

        {/* Navigation arrows (desktop) */}
        {hasPrev && (
          <button
            onClick={() => goTo(currentIndex - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2.5 transition-all active:scale-90 hidden sm:flex"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={() => goTo(currentIndex + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2.5 transition-all active:scale-90 hidden sm:flex"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        )}

        {/* Bottom details bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-4 pt-10 pb-safe">
          <div className="max-w-lg mx-auto space-y-3 pb-4">
            {/* Caption */}
            {post.caption && (
              <p className="text-white/90 text-sm leading-relaxed">
                <span className="font-semibold text-white mr-1.5">
                  @{post.profiles?.handle}
                </span>
                {post.caption}
              </p>
            )}

            {/* Activity tag */}
            {post.activity_tag && (
              <span className="inline-block bg-white/15 backdrop-blur-sm text-white/90 text-xs px-2.5 py-1 rounded-full">
                {post.activity_tag}
              </span>
            )}

            {/* Actions row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLike}
                  className="flex items-center gap-1.5 active:scale-90 transition-transform"
                >
                  <Heart
                    className={cn(
                      "h-6 w-6 transition-colors",
                      post.user_has_liked
                        ? "text-red-500 fill-red-500"
                        : "text-white"
                    )}
                  />
                  <span className="text-white/80 text-sm">{post.likes_count}</span>
                </button>
              </div>

              <span className="text-white/50 text-xs">
                {format(parseISO(post.created_at), "d MMM yyyy · HH:mm")}
              </span>
            </div>

            {/* Dot indicators */}
            {posts.length > 1 && posts.length <= 10 && (
              <div className="flex justify-center gap-1.5 pt-1">
                {posts.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      i === currentIndex
                        ? "bg-white w-4"
                        : "bg-white/40"
                    )}
                  />
                ))}
              </div>
            )}
            {posts.length > 10 && (
              <div className="text-center text-white/50 text-xs">
                {currentIndex + 1} / {posts.length}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
