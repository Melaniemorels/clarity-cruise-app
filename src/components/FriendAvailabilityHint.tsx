import { useState } from "react";
import { Users, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { SharedFreeBlock } from "@/hooks/use-friend-availability";
import { CreatePlanSheet } from "@/components/CreatePlanSheet";
import { motion, AnimatePresence } from "framer-motion";

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

  // Guard against missing data
  const friends = block?.friends ?? [];
  if (friends.length === 0) return null;

  const topPx = block.startMinute * pixelsPerMinute;
  const baseHeight = block.endMinute - block.startMinute;
  const collapsedHeight = Math.max(36, baseHeight * pixelsPerMinute);

  const friendCount = friends.length;
  const firstName = friends[0]?.name ?? "";

  const getLabel = () => {
    if (friendCount === 1) {
      return t("calendar.friendHint.bothFree", { name: firstName });
    }
    if (friendCount === 2) {
      return t("calendar.friendHint.twoFree", {
        name1: friends[0].name,
        name2: friends[1].name,
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

  const formatMinute = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  // Constrain expanded content to fit within the time slot
  const slotHeight = (block.endMinute - block.startMinute) * pixelsPerMinute;
  const maxExpandedHeight = Math.max(80, slotHeight);

  return (
    <>
      <div
        className={`absolute left-1 right-1 pointer-events-auto ${expanded ? "z-30" : "z-10"}`}
        style={{
          top: `${topPx}px`,
          height: expanded ? "auto" : `${slotHeight}px`,
        }}
      >
        <div
          className={`timeline-item timeline-social-surface rounded-xl border 
            transition-[background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
            flex flex-col
            ${expanded ? "timeline-social-surface-expanded border-solid shadow-lg" : "border-dashed h-full overflow-hidden"}`}
        >
          {/* Header */}
          <button
            onClick={handleToggle}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left 
              transition-colors duration-200 hover:bg-primary/[0.05] rounded-xl flex-shrink-0"
          >
            <Users className="h-3.5 w-3.5 text-primary/40 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] leading-tight text-muted-foreground/80 truncate">
                {getLabel()}
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                {formatMinute(block.startMinute)} – {formatMinute(block.endMinute)}
              </p>
            </div>
            {expanded ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
            )}
          </button>

          {/* Expanded content — scrollable within slot bounds */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="overflow-hidden"
              >
                <div className="overflow-y-auto h-full overscroll-contain px-4 pb-4 space-y-4"
                  style={{ touchAction: 'pan-y' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Prompt */}
                  <p className="text-[11px] text-muted-foreground/60 italic leading-relaxed">
                    {t("calendar.friendHint.prompt")}
                  </p>

                  {/* Friends list */}
                  {friendCount > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {friends.map((f) => (
                        <span
                          key={f.name}
                          className="text-[10px] px-2.5 py-1 rounded-full bg-secondary/60 text-secondary-foreground/80"
                        >
                          {f.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Plan suggestions — horizontal scroll */}
                  <div className="space-y-3">
                    <p className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-widest">
                      {t("calendar.friendHint.planIdeas")}
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                      {PLAN_CATEGORIES.normal.map((plan) => (
                        <button
                          key={plan.key}
                          onClick={(e) => handleSuggestPlan(plan.key, e)}
                          className="text-[10px] px-3 py-1.5 rounded-full border border-border/60 
                            bg-background text-foreground/70 hover:bg-secondary/50 
                            transition-colors duration-200 whitespace-nowrap flex-shrink-0"
                        >
                          {plan.icon} {t(`calendar.friendHint.plans.${plan.key}`)}
                        </button>
                      ))}
                    </div>

                    <p className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-widest pt-1">
                      {t("calendar.friendHint.funIdeas")}
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                      {PLAN_CATEGORIES.fun.map((plan) => (
                        <button
                          key={plan.key}
                          onClick={(e) => handleSuggestPlan(plan.key, e)}
                          className="text-[10px] px-3 py-1.5 rounded-full border border-border/60 
                            bg-background text-foreground/70 hover:bg-secondary/50 
                            transition-colors duration-200 whitespace-nowrap flex-shrink-0"
                        >
                          {plan.icon} {t(`calendar.friendHint.plans.${plan.key}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="h-px bg-border/30" />

                  {/* Actions */}
                  <div className="flex gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.success(
                          t("calendar.friendHint.inviteSent", {
                            name: friends.map((f) => f.name).join(", "),
                          }),
                          { duration: 2500 }
                        );
                      }}
                      className="text-[10px] font-medium text-primary/60 hover:text-primary 
                        transition-colors duration-200 flex items-center gap-1.5"
                    >
                      <Users className="h-3 w-3" />
                      {t("calendar.friendHint.inviteFriends")}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreatePlanOpen(true);
                      }}
                      className="text-[10px] font-medium text-primary/60 hover:text-primary 
                        transition-colors duration-200 flex items-center gap-1.5"
                    >
                      <Plus className="h-3 w-3" />
                      {t("calendar.friendHint.createPlan")}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <CreatePlanSheet
        open={createPlanOpen}
        onOpenChange={setCreatePlanOpen}
        friends={friends}
        startMinute={block.startMinute}
        endMinute={block.endMinute}
      />
    </>
  );
};
