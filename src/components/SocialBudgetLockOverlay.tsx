import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SocialBudgetLockOverlayProps {
  visible: boolean;
}

export function SocialBudgetLockOverlay({ visible }: SocialBudgetLockOverlayProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
      <div className="text-center p-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <p className="text-lg font-medium text-foreground mb-1">
          {t('socialBudget.limitReached')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('socialBudget.limitReachedDesc')}
        </p>
      </div>
    </div>
  );
}
