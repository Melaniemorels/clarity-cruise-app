import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Home, Sparkles, CalendarDays, Leaf } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface SocialBudgetLockOverlayProps {
  visible: boolean;
  allowExtensions?: boolean;
  onExtend?: () => void;
  onReturnToFocus?: () => void;
}

// Get daily rotating subtitle (one per day)
function getDailySubtitleKey(): number {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return (dayOfYear % 5) + 1;
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

  const handleViewDay = useCallback(() => {
    navigate("/calendar");
  }, [navigate]);

  if (!visible) return null;

  const subtitleKey = `socialBudget.completedSubtitle${getDailySubtitleKey()}`;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center pointer-events-auto">
      {/* Centered content with safe area padding */}
      <div className="flex flex-col items-center justify-center text-center px-6 py-8 max-w-sm w-full pb-safe">
        {/* Calm icon */}
        <div className="w-16 h-16 mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Leaf className="w-7 h-7 text-primary" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {t('socialBudget.completed')}
        </h2>

        {/* Rotating subtitle - improved contrast */}
        <p className="text-sm text-muted-foreground/90 mb-8">
          {t(subtitleKey)}
        </p>

        {/* Action buttons with 48px min tap targets */}
        <div className="space-y-3 w-full">
          {/* Primary action - Return to Focus */}
          <Button
            onClick={handleReturnToFocus}
            className="w-full min-h-[48px] text-base font-medium rounded-xl bg-primary hover:bg-primary/90"
          >
            <Home className="w-4 h-4 mr-2" />
            {t('socialBudget.returnToFocus')}
          </Button>

          {/* Secondary action - Extend time */}
          {allowExtensions && onExtend && (
            <Button
              onClick={onExtend}
              variant="outline"
              className="w-full min-h-[48px] text-base font-medium rounded-xl border-border hover:bg-secondary"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t('socialBudget.extendTime')}
              <span className="ml-2 text-xs text-muted-foreground/80">
                {t('socialBudget.onceMore')}
              </span>
            </Button>
          )}

          {/* Tertiary action - View my day */}
          <Button
            onClick={handleViewDay}
            variant="ghost"
            className="w-full min-h-[48px] text-sm text-muted-foreground/80 hover:text-foreground"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            {t('socialBudget.viewMyDay')}
          </Button>
        </div>
      </div>
    </div>
  );
}
