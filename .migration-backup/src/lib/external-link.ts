import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Detects the content provider from a URL.
 */
export type ContentProvider = 'youtube' | 'spotify' | 'apple_podcasts' | 'audible' | 'huberman' | 'other';

const PROVIDER_PATTERNS: { pattern: RegExp; provider: ContentProvider }[] = [
  { pattern: /youtube\.com|youtu\.be/, provider: 'youtube' },
  { pattern: /spotify\.com|open\.spotify/, provider: 'spotify' },
  { pattern: /podcasts\.apple\.com/, provider: 'apple_podcasts' },
  { pattern: /audible\.com/, provider: 'audible' },
  { pattern: /hubermanlab\.com/, provider: 'huberman' },
];

export function detectProvider(url: string): ContentProvider {
  for (const { pattern, provider } of PROVIDER_PATTERNS) {
    if (pattern.test(url)) return provider;
  }
  return 'other';
}

/** Providers that show a "direct integration coming soon" caption */
export const COMING_SOON_PROVIDERS: ContentProvider[] = ['youtube', 'spotify', 'apple_podcasts'];

/** Provider display label i18n keys */
export const PROVIDER_LABEL_KEYS: Record<ContentProvider, string> = {
  youtube: 'explore.providers.youtube',
  spotify: 'explore.providers.spotify',
  apple_podcasts: 'explore.providers.applePodcasts',
  audible: 'explore.providers.audible',
  huberman: 'explore.providers.huberman',
  other: 'explore.providers.other',
};

/**
 * Normalises a URL — ensures https:// prefix.
 */
function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

/**
 * Opens a URL externally (system browser / native app).
 * Never opens inside an iframe or WebView.
 */
export async function openExternal(url: string): Promise<void> {
  const normalised = normalizeUrl(url);

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: normalised });
  } else {
    window.open(normalised, '_blank', 'noopener,noreferrer');
  }
}
