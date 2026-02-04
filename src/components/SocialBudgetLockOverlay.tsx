import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Home, Sparkles, CalendarDays, Leaf } from "lucide-react";

interface SocialBudgetLockOverlayProps {
  visible: boolean;
  allowExtensions?: boolean;
  onExtend?: () => void;
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
  onExtend 
}: SocialBudgetLockOverlayProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!visible) return null;

  const subtitleKey = `socialBudget.completedSubtitle${getDailySubtitleKey()}`;

  const handleReturnToFocus = () => {
    navigate("/");
  };

  const handleViewDay = () => {
    navigate("/calendar");
  };

  return (
    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-md flex items-center justify-center pointer-events-auto">
      <div className="text-center p-6 max-w-sm mx-auto">
        {/* Calm icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Leaf className="w-7 h-7 text-primary" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {t('socialBudget.completed')}
        </h2>

        {/* Rotating subtitle */}
        <p className="text-sm text-muted-foreground mb-8">
          {t(subtitleKey)}
        </p>

        {/* Action buttons */}
        <div className="space-y-3">
          {/* Primary action - Return to Focus */}
          <Button
            onClick={handleReturnToFocus}
            className="w-full h-12 text-base font-medium rounded-xl bg-primary hover:bg-primary/90"
          >
            <Home className="w-4 h-4 mr-2" />
            {t('socialBudget.returnToFocus')}
          </Button>

          {/* Secondary action - Extend time */}
          {allowExtensions && onExtend && (
            <Button
              onClick={onExtend}
              variant="outline"
              className="w-full h-12 text-base font-medium rounded-xl border-border hover:bg-secondary"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t('socialBudget.extendTime')}
              <span className="ml-2 text-xs text-muted-foreground">
                {t('socialBudget.onceMore')}
              </span>
            </Button>
          )}

          {/* Tertiary action - View my day */}
          <Button
            onClick={handleViewDay}
            variant="ghost"
            className="w-full h-10 text-sm text-muted-foreground hover:text-foreground"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            {t('socialBudget.viewMyDay')}
          </Button>
        </div>
      </div>
    </div>
  );
}
