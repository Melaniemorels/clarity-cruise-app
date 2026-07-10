import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Watch, Sparkles, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchNotifications } from "@/hooks/use-watch-notifications";
import AINotificationPreview from "./AINotificationPreview";

const WatchNotificationsCard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { generate, loading, result } = useWatchNotifications();

  const handleGenerate = async () => {
    if (!user) return;
    await generate();
  };

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Watch className="h-4 w-4 text-foreground" />
          <h2 className="font-semibold text-foreground">
            {t("devices.watchNotifs.title")}
          </h2>
        </div>
        <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
          {t("devices.comingSoon")}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground">
        {t("devices.watchNotifs.description")}
      </p>

      {/* AI Generation Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground">
              {t("devices.watchNotifs.aiTitle", "AI-Powered Notifications")}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              "devices.watchNotifs.aiDescription",
              "Generate contextual notifications based on your stress levels, energy state, and calendar."
            )}
          </p>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading || !user}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                {t("devices.watchNotifs.generating", "Analyzing your context...")}
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                {t("devices.watchNotifs.generateBtn", "Generate smart notifications")}
              </>
            )}
          </Button>

          {/* AI Results Preview */}
          {result && result.notifications.length > 0 && (
            <AINotificationPreview result={result} />
          )}

          {result && result.notifications.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-2">
              {t(
                "devices.watchNotifs.limitReached",
                "Daily notification limit reached. Your attention is protected."
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WatchNotificationsCard;
