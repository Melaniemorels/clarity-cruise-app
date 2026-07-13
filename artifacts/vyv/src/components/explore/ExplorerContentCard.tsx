import { useTranslation } from "react-i18next";
import { ArrowUpRight, Bookmark, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDevice } from "@/hooks/use-device";
import { explorerText, explorerCard } from "./explorer-tokens";

export interface ExplorerContentCardProps {
  title: string;
  description?: string | null;
  /** i18n key for the source/provider chip (e.g. explore.providers.youtube) */
  providerLabelKey?: string | null;
  durationMin?: number | null;
  /** Preformatted duration (e.g. "12 min") — used when durationMin is absent */
  durationLabel?: string | null;
  /** i18n key for the category chip */
  categoryLabelKey?: string | null;
  /** Recommendation explanation (already localized by the backend) */
  reason?: string | null;
  /** Shows the "Curated by VYV" chip */
  curated?: boolean;
  saved?: boolean;
  /** 0–100 progress bar under the artwork */
  progress?: number | null;
  /** Shows the "integration coming soon" caption */
  comingSoon?: boolean;
  /** Artwork: gradient classes + centered icon */
  gradient?: string;
  icon?: LucideIcon;
  /** carousel = fixed width; grid = fills its cell */
  layout?: "carousel" | "grid";
  onOpen: () => void;
  onSave?: () => void;
}

export function ExplorerContentCard({
  title,
  description,
  providerLabelKey,
  durationMin,
  durationLabel,
  categoryLabelKey: catKey,
  reason,
  curated,
  saved,
  progress,
  comingSoon,
  gradient,
  icon: Icon,
  layout = "carousel",
  onOpen,
  onSave,
}: ExplorerContentCardProps) {
  const { t } = useTranslation();
  const device = useDevice();

  const isCarousel = layout === "carousel";
  const width = isCarousel
    ? device.isMobile
      ? explorerCard.carouselWidth.mobile
      : device.isTablet
        ? explorerCard.carouselWidth.tablet
        : explorerCard.carouselWidth.desktop
    : "w-full";
  const artworkHeight = device.isMobile
    ? explorerCard.artworkHeight.mobile
    : explorerCard.artworkHeight.desktop;
  const duration =
    durationMin != null ? `${durationMin} min` : durationLabel ?? null;

  return (
    <div
      className={cn(
        explorerCard.shell,
        "flex flex-col",
        isCarousel && "flex-shrink-0",
        width,
      )}
      onClick={onOpen}
    >
      {/* Artwork */}
      {gradient && (
        <div
          className={cn(
            "relative flex items-center justify-center",
            `bg-gradient-to-br ${gradient}`,
            artworkHeight,
          )}
        >
          {Icon && (
            <Icon className="h-10 w-10 text-foreground/40" strokeWidth={1.5} />
          )}
          {duration && (
            <span className="absolute top-2.5 right-2.5 text-[10px] font-medium tracking-wide text-muted-foreground bg-card/70 backdrop-blur-sm rounded-full px-2 py-0.5">
              {duration}
            </span>
          )}
          {progress != null && progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-foreground/10">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className={cn(explorerCard.body, "flex flex-col flex-1")}>
        <h3
          className={cn(
            explorerText.cardTitle,
            device.isMobile ? "text-[13px]" : "text-sm",
          )}
        >
          {title}
        </h3>

        {description && (
          <p className={explorerText.cardDescription}>{description}</p>
        )}

        {reason && <p className={explorerText.cardDescription}>{reason}</p>}

        <div className="flex items-center gap-1.5 flex-wrap">
          {providerLabelKey && (
            <span className={explorerText.sourceChip}>
              {t(providerLabelKey)}
            </span>
          )}
          {catKey && (
            <span className={explorerText.sourceChip}>{t(catKey)}</span>
          )}
          {curated && (
            <span className={explorerText.curatedChip}>
              {t("explore.curatedByVyv")}
            </span>
          )}
          {duration && !gradient && (
            <span className={explorerText.cardMeta}>{duration}</span>
          )}
        </div>

        {/* Actions — pinned to the bottom so cards stay equal height */}
        <div className="flex items-center justify-between pt-0.5 mt-auto">
          <button
            className={explorerText.textAction}
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            {t("explore.open")}
          </button>
          {onSave && (
            <button
              className={cn(
                "p-1 rounded-full transition-colors hover:bg-muted/50",
                saved
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={saved ? t("explore.savedLabel") : t("explore.saveLabel")}
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
            >
              <Bookmark
                className="h-4 w-4"
                fill={saved ? "currentColor" : "none"}
              />
            </button>
          )}
        </div>

        {comingSoon && (
          <p className="text-[9px] text-muted-foreground/60 leading-tight">
            {t("explore.integrationComingSoon")}
          </p>
        )}
      </div>
    </div>
  );
}
