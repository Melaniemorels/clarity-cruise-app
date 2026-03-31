import { Users } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { SharedFreeBlock } from "@/hooks/use-friend-availability";

interface FriendAvailabilityHintProps {
  block: SharedFreeBlock;
  pixelsPerMinute: number;
}

export const FriendAvailabilityHint = ({
  block,
  pixelsPerMinute,
}: FriendAvailabilityHintProps) => {
  const { t } = useTranslation();
  const topPx = block.startMinute * pixelsPerMinute;
  const heightPx = Math.max(36, (block.endMinute - block.startMinute) * pixelsPerMinute);

  const handleSuggestPlan = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success(
      t("calendar.friendHint.inviteSent", { name: block.friendName }),
      { duration: 2500 }
    );
  };

  // Compact layout when block is small
  const isCompact = heightPx < 50;

  return (
    <div
      className="absolute left-1 right-1 z-[5] pointer-events-auto"
      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
    >
      <div
        className={`h-full rounded-lg border border-dashed border-primary/20 bg-primary/[0.04] 
          flex items-center gap-2 px-3 transition-colors hover:bg-primary/[0.07]
          ${isCompact ? "py-1" : "py-2"}`}
      >
        <Users className="h-3.5 w-3.5 text-primary/50 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] leading-tight text-muted-foreground truncate">
            {t("calendar.friendHint.bothFree", { name: block.friendName })}
          </p>
        </div>
        <button
          onClick={handleSuggestPlan}
          className="text-[10px] font-medium text-primary/70 hover:text-primary 
            whitespace-nowrap flex-shrink-0 transition-colors"
        >
          {t("calendar.friendHint.suggestPlan")}
        </button>
      </div>
    </div>
  );
};
