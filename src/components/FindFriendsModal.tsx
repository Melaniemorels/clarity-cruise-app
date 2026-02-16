import { useNavigate } from "react-router-dom";
import { useGuide } from "@/contexts/GuideContext";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";

export function FindFriendsModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shouldShowFriendsOnboarding, completeFriendsOnboarding, dismissFriendsOnboarding } = useGuide();

  if (!shouldShowFriendsOnboarding) return null;

  return (
    <div
      className="fixed inset-0 z-[9997] flex items-center justify-center"
      style={{ backdropFilter: "blur(6px)" }}
    >
      <div className="absolute inset-0 bg-background/80" onClick={dismissFriendsOnboarding} />
      <div className="relative animate-in fade-in zoom-in-95 duration-300 rounded-3xl border border-border bg-card shadow-2xl w-[min(340px,calc(100vw-48px))] p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">{t("guide.friends.title")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {t("guide.friends.body")}
        </p>
        <div className="flex gap-3 mb-3">
          <button
            onClick={dismissFriendsOnboarding}
            className="flex-1 py-2.5 rounded-2xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"
          >
            {t("guide.friends.notNow")}
          </button>
          <button
            onClick={() => {
              completeFriendsOnboarding();
              navigate("/find-friends");
            }}
            className="flex-1 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t("guide.friends.findFriends")}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground/60">{t("guide.friends.settingsHint")}</p>
      </div>
    </div>
  );
}
