import type { TFunction } from "i18next";
import { categoryLabelKey } from "@/lib/explore-categories";

/**
 * Structured recommendation reason sent by the backend. Every kind maps to a
 * real ranking signal (goals, interests, saved history, calendar gap…) and is
 * localized here via i18next.
 */
export interface FeedReason {
  kind: string;
  goal?: string;
  category?: string;
  minutes?: number | null;
  timeOfDay?: string;
}

/** Localize a structured reason. Returns null when it cannot be translated. */
export function translateReason(
  t: TFunction,
  reason: FeedReason | string | null | undefined,
): string | null {
  if (!reason) return null;
  // Defensive: older cached responses may still carry plain strings.
  if (typeof reason === "string") return reason;

  switch (reason.kind) {
    case "goal": {
      if (!reason.goal) return null;
      const goalLabel = t(`explore.reasons.goals.${reason.goal}`, {
        defaultValue: reason.goal,
      });
      return t("explore.reasons.goal", { goal: goalLabel });
    }
    case "interest": {
      const key = categoryLabelKey(reason.category);
      const label = key ? t(key) : reason.category ?? "";
      return t("explore.reasons.interest", { category: label });
    }
    case "similar_saved":
      return t("explore.reasons.similarSaved");
    case "more_like_this":
      return t("explore.reasons.moreLikeThis");
    case "fits_gap":
      if (reason.minutes == null) return null;
      return t("explore.reasons.fitsGap", { minutes: reason.minutes });
    case "time_of_day":
      return t(`explore.reasons.tod.${reason.timeOfDay ?? "morning"}`, {
        defaultValue: t("explore.reasons.tod.morning"),
      });
    case "curated":
      return t("explore.reasons.curated");
    case "popular":
      return t("explore.reasons.popular");
    case "gap_time_of_day": {
      const tod = t(`explore.reasons.tod.${reason.timeOfDay ?? "morning"}`, {
        defaultValue: t("explore.reasons.tod.morning"),
      });
      return reason.minutes == null
        ? t("explore.reasons.todClear", { tod })
        : t("explore.reasons.todGap", { tod, minutes: reason.minutes });
    }
    default:
      return null;
  }
}
