import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Users, ChevronDown, ChevronUp, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { SharedFreeBlock } from "@/hooks/use-shared-availability-matches";
import { CreatePlanSheet } from "@/components/CreatePlanSheet";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  /** Short privacy note: free/busy only, no event titles shared. */
  showLivePrivacyNote?: boolean;
}

export const FriendAvailabilityHint = ({
  block,
  pixelsPerMinute,
  showLivePrivacyNote = false,
}: FriendAvailabilityHintProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  const friends = block?.friends ?? [];
  if (friends.length === 0) return null;

  const topPx = block.startMinute * pixelsPerMinute;
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
    setSelectedPlan((prev) => (prev === planKey ? null : planKey));
  };

  const handleConfirmPlan = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPlan) {
      const planName = t(`calendar.friendHint.plans.${selectedPlan}`);
      toast.success(
        t("calendar.friendHint.planSuggested", { plan: planName }),
        { duration: 2500 }
      );
      setSelectedPlan(null);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
    setSelectedPlan(null);
  };

  const formatMinute = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0
      ? `${h12} ${suffix}`
      : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  const timeLabel = `${formatMinute(block.startMinute)} – ${formatMinute(block.endMinute)}`;
  const slotHeight = (block.endMinute - block.startMinute) * pixelsPerMinute;

  return (
    <>
      {/* Collapsed hint — positioned inside the timeline slot */}
      <div
        className="absolute left-1 right-1 z-10 pointer-events-auto"
        style={{
          top: `${topPx}px`,
          height: `${slotHeight}px`,
        }}
      >
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            "timeline-social-surface rounded-xl border border-dashed",
            "w-full h-full flex items-center gap-2.5 px-3.5",
            "transition-all duration-200 hover:bg-primary/[0.08]",
            "min-h-[40px]"
          )}
        >
          <Users className="h-3.5 w-3.5 text-primary/50 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[11px] leading-tight text-muted-foreground/80 truncate">
              {getLabel()}
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
              {timeLabel}
            </p>
            {showLivePrivacyNote && (
              <p className="text-[10px] text-muted-foreground/50 mt-0.5 leading-tight line-clamp-2">
                {t("calendar.friendHint.livePrivacyNoteCollapsed")}
              </p>
            )}
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
        </button>
      </div>

      {/* Expanded card — portaled to body so fixed overlay is not clipped by calendar scroll parents */}
      {portalReady &&
        createPortal(
          <AnimatePresence>
            {expanded && (
              <>
                <motion.div
                  key="friend-hint-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
                  onClick={handleToggle}
                  aria-hidden
                />

                <motion.div
                  key="friend-hint-panel"
                  initial={{ opacity: 0, y: 24, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.97 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="fixed inset-x-4 bottom-4 z-50 max-w-lg mx-auto pointer-events-auto"
                  role="dialog"
                  aria-modal="true"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="timeline-social-surface-expanded rounded-2xl border border-border/60 shadow-lg overflow-hidden">
                {/* Header */}
                <div className="px-5 pt-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {getLabel()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {timeLabel}
                        </p>
                        {showLivePrivacyNote && (
                          <p className="text-xs text-muted-foreground/70 mt-1.5 leading-relaxed">
                            {t("calendar.friendHint.livePrivacyNoteExpanded")}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggle}
                      className="p-1.5 -m-1.5 rounded-lg hover:bg-muted/60 transition-colors flex-shrink-0"
                    >
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Friends (when multiple) */}
                {friendCount > 1 && (
                  <div className="px-5 pb-3">
                    <div className="flex flex-wrap gap-2">
                      {friends.map((f) => (
                        <span
                          key={f.name}
                          className="text-xs px-3 py-1.5 rounded-full bg-secondary/60 text-secondary-foreground/80"
                        >
                          {f.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="h-px bg-border/30 mx-5" />

                {/* Plan Suggestions */}
                <div
                  className="px-5 py-4 space-y-4 max-h-[50vh] overflow-y-auto overscroll-contain"
                  style={{ touchAction: "pan-y" }}
                >
                  {/* Prompt */}
                  <p className="text-xs text-muted-foreground/70 italic leading-relaxed">
                    {t("calendar.friendHint.prompt")}
                  </p>

                  {/* Normal plans */}
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
                      {t("calendar.friendHint.planIdeas")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PLAN_CATEGORIES.normal.map((plan) => (
                        <button
                          key={plan.key}
                          onClick={(e) => handleSuggestPlan(plan.key, e)}
                          className={cn(
                            "text-xs px-3.5 py-2 rounded-full border transition-all duration-200",
                            "min-h-[36px]",
                            selectedPlan === plan.key
                              ? "bg-primary/10 border-primary/40 text-primary ring-1 ring-primary/20"
                              : "border-border/50 bg-background text-foreground/70 hover:bg-secondary/40 hover:border-border/80"
                          )}
                        >
                          <span className="mr-1">{plan.icon}</span>
                          {t(`calendar.friendHint.plans.${plan.key}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fun plans */}
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
                      {t("calendar.friendHint.funIdeas")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PLAN_CATEGORIES.fun.map((plan) => (
                        <button
                          key={plan.key}
                          onClick={(e) => handleSuggestPlan(plan.key, e)}
                          className={cn(
                            "text-xs px-3.5 py-2 rounded-full border transition-all duration-200",
                            "min-h-[36px]",
                            selectedPlan === plan.key
                              ? "bg-primary/10 border-primary/40 text-primary ring-1 ring-primary/20"
                              : "border-border/50 bg-background text-foreground/70 hover:bg-secondary/40 hover:border-border/80"
                          )}
                        >
                          <span className="mr-1">{plan.icon}</span>
                          {t(`calendar.friendHint.plans.${plan.key}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-border/30 mx-5" />

                {/* Actions */}
                <div className="px-5 py-4 flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10 rounded-xl text-xs font-medium gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.success(
                        t("calendar.friendHint.inviteSent", {
                          name: friends.map((f) => f.name).join(", "),
                        }),
                        { duration: 2500 }
                      );
                    }}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {t("calendar.friendHint.inviteFriends")}
                  </Button>

                  <Button
                    size="sm"
                    className="flex-1 h-10 rounded-xl text-xs font-medium gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPlan) {
                        handleConfirmPlan(e);
                      } else {
                        setExpanded(false);
                        setCreatePlanOpen(true);
                      }
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {selectedPlan
                      ? t("calendar.friendHint.planSuggested", {
                          plan: "",
                        }).trim() || t("calendar.friendHint.createPlan")
                      : t("calendar.friendHint.createPlan")}
                  </Button>
                </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}

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
