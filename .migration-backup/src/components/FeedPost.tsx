import { Card, CardContent } from "@/components/ui/card";
import { Heart, Bookmark } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ScreenshotGuard } from "@/components/ScreenshotGuard";

interface FeedPostProps {
  postId: string;
  postUserId?: string;
  userHandle: string;
  userPhotoUrl?: string;
  photoUrl?: string;
  caption?: string;
  createdAt: string;
  inspireCount: number;
  saveCount: number;
  hasInspired: boolean;
  hasSaved: boolean;
}

export const FeedPost = ({
  postId,
  postUserId,
  userHandle,
  userPhotoUrl,
  photoUrl,
  caption,
  createdAt,
  inspireCount: initialInspireCount,
  saveCount: initialSaveCount,
  hasInspired: initialHasInspired,
  hasSaved: initialHasSaved,
}: FeedPostProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isOwnPost = user?.id === postUserId;
  const [inspireCount, setInspireCount] = useState(initialInspireCount);
  const [saveCount, setSaveCount] = useState(initialSaveCount);
  const [hasInspired, setHasInspired] = useState(initialHasInspired);
  const [hasSaved, setHasSaved] = useState(initialHasSaved);
  const isReacting = useRef(false);

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const posted = new Date(date);
    const diffMs = now.getTime() - posted.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return t('time.daysAgo', { count: diffDays });
    if (diffHours > 0) return t('time.hoursAgo', { count: diffHours });
    if (diffMins > 0) return t('time.minutesAgo', { count: diffMins });
    return t('time.justNow');
  };

  const handleReaction = async (type: "INSPIRE" | "SAVE_IDEA") => {
    if (!user || isReacting.current) return;
    isReacting.current = true;
    const isCurrentlyReacted = type === "INSPIRE" ? hasInspired : hasSaved;

    try {
      if (isCurrentlyReacted) {
        // Remove reaction
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq("entry_id", postId)
          .eq("user_id", user.id)
          .eq("type", type);

        if (error) throw error;

        if (type === "INSPIRE") {
          setInspireCount((c) => c - 1);
          setHasInspired(false);
        } else {
          setSaveCount((c) => c - 1);
          setHasSaved(false);
        }
      } else {
        // Add reaction
        const { error } = await supabase.from("reactions").insert({
          entry_id: postId,
          user_id: user.id,
          type,
        });

        if (error) throw error;

        if (type === "INSPIRE") {
          setInspireCount((c) => c + 1);
          setHasInspired(true);
        } else {
          setSaveCount((c) => c + 1);
          setHasSaved(true);
        }
      }
    } catch (error) {
      toast.error(t('post.errors.likeError'));
      if (import.meta.env.DEV) {
        console.error("Reaction error:", error);
      }
    } finally {
      isReacting.current = false;
    }
  };

  return (
    <ScreenshotGuard enabled={!isOwnPost}>
      <Card className="overflow-hidden">
        {/* User Header */}
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg overflow-hidden">
            {userPhotoUrl ? (
              <img src={userPhotoUrl} alt={userHandle} className="w-full h-full object-cover" />
            ) : (
              "🌿"
            )}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">@{userHandle}</div>
            <div className="text-xs text-muted-foreground">{getTimeAgo(createdAt)}</div>
          </div>
        </div>

        {/* Photo */}
        {photoUrl && (
          <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
            <img src={photoUrl} alt="Post" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Content */}
        <CardContent className="p-4">
          {caption && <p className="text-sm mb-3">{caption}</p>}
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleReaction("INSPIRE")}
              className={`flex items-center gap-1 transition-colors ${
                hasInspired ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Heart className={`h-5 w-5 ${hasInspired ? "fill-current" : ""}`} />
              <span className="text-sm">{inspireCount}</span>
            </button>
            
            <button
              onClick={() => handleReaction("SAVE_IDEA")}
              className={`flex items-center gap-1 transition-colors ${
                hasSaved ? "text-secondary" : "text-muted-foreground hover:text-secondary"
              }`}
            >
              <Bookmark className={`h-5 w-5 ${hasSaved ? "fill-current" : ""}`} />
              <span className="text-sm">{saveCount}</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </ScreenshotGuard>
  );
};
