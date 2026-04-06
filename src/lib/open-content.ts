import { openExternal, normalizeMediaUrl } from "@/lib/external-link";
import { toast } from "sonner";

/**
 * Resolves a URL from provider + contentId when no direct URL exists.
 */
function resolveUrl(provider: string, contentId?: string): string | null {
  if (!contentId) return null;
  switch (provider) {
    case "youtube":
      return `https://www.youtube.com/watch?v=${contentId}`;
    case "spotify":
      return `https://open.spotify.com/track/${contentId}`;
    case "audible":
      return `https://www.audible.com/pd/${contentId}`;
    default:
      return null;
  }
}

export interface ContentItem {
  url?: string | null;
  provider?: string;
  contentId?: string;
  title?: string;
}

/**
 * Opens content externally with fallback URL resolution and copy-link on error.
 * Returns true if a URL was found and open was attempted.
 */
/**
 * Opens YouTube / Spotify / other media URLs in the system browser (or in-app browser on native).
 * Runs synchronously so it stays within the user gesture (avoids blocked pop-ups).
 */
export function openContent(item: ContentItem, t: (key: string) => string): boolean {
  const raw = item.url || resolveUrl(item.provider ?? "other", item.contentId);

  if (!raw?.trim()) {
    toast(t("explore.unavailable.title"), {
      description: t("explore.unavailable.noUrl"),
      duration: 4000,
    });
    return false;
  }

  const url = normalizeMediaUrl(raw);

  try {
    openExternal(url);
    return true;
  } catch {
    toast.error(t("explore.unavailable.title"), {
      description: t("explore.unavailable.error"),
      duration: 6000,
      action: {
        label: t("explore.copyLink"),
        onClick: () => {
          void navigator.clipboard.writeText(url).then(() => {
            toast.success(t("explore.linkCopied"));
          });
        },
      },
    });
    return false;
  }
}
