import { useState } from "react";
import { Users, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { SharedFreeBlock } from "@/hooks/use-friend-availability";
import { CreatePlanSheet } from "@/components/CreatePlanSheet";

// Plan suggestion data
const PLAN_CATEGORIES = {
  normal: [
    { key: "coffee", icon: "☕" },
    { key: "walk", icon: "🚶" },
    { key: "lunch", icon: "🍽" },
    { key: "study", icon: "📚" },
    { key: "catchUp", icon: "💬" },
  ],
  fun: [
    { key: "sunsetPicnic", icon: "🌅" },
    { key: "beachWalk", icon: "🏖" },
    { key: "newCafe", icon: "✨" },
    { key: "workout", icon: "💪" },
    { key: "dinner", icon: "🍷" },
  ],
} as const;

interface FriendAvailabilityHintProps {
  block: SharedFreeBlock;
  pixelsPerMinute: number;
}

export const FriendAvailabilityHint = ({
  block,
  pixelsPerMinute,
}: FriendAvailabilityHintProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);

  const topPx = block.startMinute * pixelsPerMinute;
  const baseHeight = block.endMinute - block.startMinute;
  const collapsedHeight = Math.max(36, baseHeight * pixelsPerMinute);

  const friendCount = block.friends.length;
  const firstName = block.friends[0]?.name ?? "";

  // Build the availability label
  const getLabel = () => {
    if (friendCount === 1) {
      return t("calendar.friendHint.bothFree", { name: firstName });
    }
    if (friendCount === 2) {
      return t("calendar.friendHint.twoFree", {
        name1: block.friends[0].name,
        name2: block.friends[1].name,
      });
    }
    return t("calendar.friendHint.manyFree", {
      name: firstName,
      count: friendCount - 1,
    });
  };

  const handleSuggestPlan = (planKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const planName = t(`calendar.friendHint.plans.${planKey}`);
    toast.success(
      t("calendar.friendHint.planSuggested", { plan: planName }),
      { duration: 2500 }
    );
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const isCompact = collapsedHeight < 50;

  // Format time range for display
  const formatMinute = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  return (
    <>
      <div
        className="absolute left-1 right-1 z-[5] pointer-events-auto"
        style={{
          top: `${topPx}px`,
          minHeight: `${collapsedHeight}px`,
        }}
      >
        <div
          className={`rounded-lg border border-dashed border-primary/20 bg-primary/[0.04] 
            transition-all duration-200 ${expanded ? "shadow-sm" : ""}`}
        >
          {/* Header row */}
          <button
            onClick={handleToggle}
            className={`w-full flex items-center gap-2 px-3 text-left transition-colors 
              hover:bg-primary/[0.07] rounded-t-lg ${isCompact ? "py-1.5" : "py-2.5"}`}
          >
            <Users className="h-3.5 w-3.5 text-primary/50 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] leading-tight text-muted-foreground truncate">
                {getLabel()}
              </p>
              {!isCompact && (
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {formatMinute(block.startMinute)} – {formatMinute(block.endMinute)}
                </p>
              )}
            </div>
            {expanded ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
            )}
          </button>

          {/* Expanded content */}
          {expanded && (
            <div className="px-3 pb-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              {/* Prompt */}
              <p className="text-[11px] text-muted-foreground/70 italic">
                {t("calendar.friendHint.prompt")}
              </p>

              {/* Friends list (if multiple) */}
              {friendCount > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {block.friends.map((f) => (
                    <span
                      key={f.name}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                    >
                      {f.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Plan suggestions */}
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  {t("calendar.friendHint.planIdeas")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PLAN_CATEGORIES.normal.map((plan) => (
                    <button
                      key={plan.key}
                      onClick={(e) => handleSuggestPlan(plan.key, e)}
                      className="text-[10px] px-2.5 py-1 rounded-full border border-border 
                        bg-background text-foreground hover:bg-secondary transition-colors"
                    >
                      {plan.icon} {t(`calendar.friendHint.plans.${plan.key}`)}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide pt-1">
                  {t("calendar.friendHint.funIdeas")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PLAN_CATEGORIES.fun.map((plan) => (
                    <button
                      key={plan.key}
                      onClick={(e) => handleSuggestPlan(plan.key, e)}
                      className="text-[10px] px-2.5 py-1 rounded-full border border-border 
                        bg-background text-foreground hover:bg-secondary transition-colors"
                    >
                      {plan.icon} {t(`calendar.friendHint.plans.${plan.key}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.success(
                      t("calendar.friendHint.inviteSent", {
                        name: block.friends.map((f) => f.name).join(", "),
                      }),
                      { duration: 2500 }
                    );
                  }}
                  className="text-[10px] font-medium text-primary/70 hover:text-primary 
                    transition-colors flex items-center gap-1"
                >
                  <Users className="h-3 w-3" />
                  {t("calendar.friendHint.inviteFriends")}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreatePlanOpen(true);
                  }}
                  className="text-[10px] font-medium text-primary/70 hover:text-primary 
                    transition-colors flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  {t("calendar.friendHint.createPlan")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreatePlanSheet
        open={createPlanOpen}
        onOpenChange={setCreatePlanOpen}
        friends={block.friends}
        startMinute={block.startMinute}
        endMinute={block.endMinute}
      />
    </>
  );
};
