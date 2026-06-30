import { useGuide } from "@/contexts/GuideContext";
import { useTranslation } from "react-i18next";

interface FocusIntroModalProps {
  open: boolean;
  onBegin: () => void;
  onLater: () => void;
}

export function FocusIntroModal({ open, onBegin, onLater }: FocusIntroModalProps) {
  const { t } = useTranslation();
  const { markFirstTap } = useGuide();

  if (!open) return null;

  const handleBegin = () => {
    markFirstTap("focusNav");
    onBegin();
  };

  const handleLater = () => {
    markFirstTap("focusNav");
    onLater();
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ backdropFilter: "blur(6px)" }}
    >
      <div className="absolute inset-0 bg-background/80" onClick={handleLater} />
      <div className="relative animate-in fade-in zoom-in-95 duration-300 rounded-3xl border border-border bg-card shadow-2xl w-[min(320px,calc(100vw-48px))] p-8 text-center">
        <p className="text-xl font-semibold text-foreground leading-snug mb-1">
          {t("guide.focusIntro.line1")}
        </p>
        <p className="text-xl font-semibold text-foreground leading-snug mb-4">
          {t("guide.focusIntro.line2")}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed mb-6">
          {t("guide.focusIntro.subtitle")}
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleLater}
            className="flex-1 py-2.5 rounded-2xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"
          >
            {t("guide.focusIntro.later")}
          </button>
          <button
            onClick={handleBegin}
            className="flex-1 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t("guide.focusIntro.begin")}
          </button>
        </div>
      </div>
    </div>
  );
}
