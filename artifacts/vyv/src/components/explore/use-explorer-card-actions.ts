import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useSavedKeys,
  useToggleSave,
  refKey,
  type ExplorerItemRef,
} from "@/hooks/use-saved-items";
import {
  useRecordOpen,
  useMarkCompleted,
} from "@/hooks/use-explorer-progress";
import {
  useRecommendationFeedback,
  useHideCreator,
} from "@/hooks/use-recommendation-feedback";
import type { ExplorerCardMenuActions } from "./ExplorerContentCard";

/**
 * Central wiring for the per-card overflow menu: save, feedback and progress
 * actions with localized toasts. Call `buildMenu(ref)` per card and
 * `recordOpen(ref)` when the user opens content.
 */
export function useExplorerCardActions() {
  const { t } = useTranslation();
  const savedKeys = useSavedKeys();
  const toggleSave = useToggleSave();
  const feedback = useRecommendationFeedback();
  const hideCreator = useHideCreator();
  const markCompleted = useMarkCompleted();
  const recordOpenMutation = useRecordOpen();

  const recordOpen = useCallback(
    (ref: ExplorerItemRef) => {
      // Fire-and-forget: opening content must never be blocked by tracking.
      recordOpenMutation.mutate(ref);
    },
    [recordOpenMutation],
  );

  const buildMenu = useCallback(
    (ref: ExplorerItemRef): ExplorerCardMenuActions => {
      const saved = savedKeys.has(refKey(ref));
      return {
        saved,
        onToggleSave: () => {
          toggleSave.mutate(
            { ref, saved },
            {
              onSuccess: () =>
                toast.success(
                  saved
                    ? t("explore.menu.removedFromSaved")
                    : t("explore.menu.savedToast"),
                ),
              onError: () => toast.error(t("explore.menu.errorGeneric")),
            },
          );
        },
        onNotInterested: () => {
          feedback.mutate(
            {
              itemId: ref.providerItemId,
              provider: ref.provider,
              action: "not_interested",
            },
            {
              onSuccess: () => toast.success(t("explore.menu.notInterestedToast")),
              onError: () => toast.error(t("explore.menu.errorGeneric")),
            },
          );
        },
        onMoreLikeThis: () => {
          feedback.mutate(
            {
              itemId: ref.providerItemId,
              provider: ref.provider,
              action: "more_like_this",
            },
            {
              onSuccess: () => toast.success(t("explore.menu.moreLikeThisToast")),
              onError: () => toast.error(t("explore.menu.errorGeneric")),
            },
          );
        },
        onHideCreator: ref.creator
          ? () => {
              hideCreator.mutate(ref.creator!, {
                onSuccess: () =>
                  toast.success(
                    t("explore.menu.hideCreatorToast", { creator: ref.creator }),
                  ),
                onError: () => toast.error(t("explore.menu.errorGeneric")),
              });
            }
          : undefined,
        onReport: () => {
          feedback.mutate(
            {
              itemId: ref.providerItemId,
              provider: ref.provider,
              action: "report",
            },
            {
              onSuccess: () => toast.success(t("explore.menu.reportToast")),
              onError: () => toast.error(t("explore.menu.errorGeneric")),
            },
          );
        },
        onMarkCompleted: () => {
          markCompleted.mutate(ref, {
            onSuccess: () => toast.success(t("explore.menu.completedToast")),
            onError: () => toast.error(t("explore.menu.errorGeneric")),
          });
        },
      };
    },
    [savedKeys, toggleSave, feedback, hideCreator, markCompleted, t],
  );

  return { buildMenu, recordOpen, savedKeys };
}

/** Build an ExplorerItemRef from a catalogue explore item. */
export function catalogueRef(item: {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
  category?: string | null;
  language?: string | null;
  duration_min?: number | null;
  thumbnail?: string | null;
  creator?: string | null;
}): ExplorerItemRef {
  return {
    provider: "vyv",
    providerItemId: item.id,
    title: item.title,
    description: item.description ?? null,
    url: item.url ?? null,
    category: item.category ?? null,
    language: item.language ?? null,
    durationMin: item.duration_min ?? null,
    thumbnail: item.thumbnail ?? null,
    creator: item.creator ?? null,
  };
}

/** Build an ExplorerItemRef for URL-only content (AI recs, Elevate). */
export function urlRef(params: {
  url: string;
  provider: string;
  title: string;
  description?: string | null;
  category?: string | null;
  durationMin?: number | null;
}): ExplorerItemRef {
  return {
    provider: params.provider,
    providerItemId: params.url,
    title: params.title,
    description: params.description ?? null,
    url: params.url,
    category: params.category ?? null,
    durationMin: params.durationMin ?? null,
  };
}
