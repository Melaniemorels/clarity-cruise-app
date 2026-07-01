import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { triggerHaptic } from "@/lib/haptics";

interface SocialBudgetLockOverlayProps {
  visible: boolean;
  allowExtensions?: boolean;
  onExtend?: () => void;
  onReturnToFocus?: () => void;
}

export function SocialBudgetLockOverlay({ 
  visible, 
  allowExtensions = true,
  onExtend,
  onReturnToFocus
}: SocialBudgetLockOverlayProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleReturnToFocus = useCallback(() => {
    // Trigger light haptic feedback on primary CTA
    triggerHaptic("light");
    
    // Notify parent to set cooldown
    onReturnToFocus?.();
    
    navigate("/entries");
  }, [navigate, onReturnToFocus]);

  const handleExtendTime = useCallback(() => {
    onExtend?.();
  }, [onExtend]);

  const handleViewDay = useCallback(() => {
    navigate("/calendar");
  }, [navigate]);

  if (!visible) return null;

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 min-h-[60vh]">
      {/* Title */}
      <h2 className="text-xl font-medium text-foreground mb-3">
        {t('socialBudget.completed')}
      </h2>

      {/* Subtitle - single line, sober */}
      <p className="text-sm text-muted-foreground mb-10 max-w-xs">
        {t('socialBudget.completedSubtitle1')}
      </p>

      {/* Action buttons with proper spacing and tap targets */}
      <div className="space-y-3 w-full max-w-xs pb-safe">
        {/* Primary action - Return to Focus */}
        <Button
          onClick={handleReturnToFocus}
          className="w-full min-h-[48px] text-base font-medium rounded-xl bg-primary hover:bg-primary/90"
        >
          {t('socialBudget.returnToFocus')}
        </Button>

        {/* Secondary action - Extend time */}
        {allowExtensions && onExtend && (
          <Button
            onClick={handleExtendTime}
            variant="outline"
            className="w-full min-h-[48px] text-base font-medium rounded-xl border-border hover:bg-secondary"
          >
            {t('socialBudget.extendTime')}
            <span className="ml-2 text-xs text-muted-foreground">
              ({t('socialBudget.onceMore')})
            </span>
          </Button>
        )}

        {/* Tertiary action - View my day */}
        <button
          onClick={handleViewDay}
          className="w-full min-h-[48px] text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('socialBudget.viewMyDay')}
        </button>
      </div>
    </div>
  );
}
