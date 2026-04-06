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
  const u = url.trim();
  if (/^spotify:/i.test(u) || /spotify\.com|open\.spotify/i.test(u)) {
    return 'spotify';
  }
  for (const { pattern, provider } of PROVIDER_PATTERNS) {
    if (pattern.test(u)) return provider;
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

const SPOTIFY_WEB_TYPES = new Set([
  'track',
  'album',
  'playlist',
  'episode',
  'show',
  'artist',
]);

/**
 * Spotify app URIs → https://open.spotify.com/… so links work in the browser.
 * Trims input; adds https for bare host paths when needed.
 */
export function normalizeMediaUrl(input: string): string {
  const u = input.trim();
  if (!u) return u;
  if (/^spotify:/i.test(u)) {
    const parts = u.split(':');
    if (parts.length >= 3) {
      const type = parts[1].toLowerCase();
      const id = parts[2];
      if (SPOTIFY_WEB_TYPES.has(type) && id) {
        return `https://open.spotify.com/${type}/${id}`;
      }
    }
    return u;
  }
  return normalizeUrl(u);
}

/**
 * Opens a URL externally (system browser / native app).
 * Synchronous on web so popup blockers do not block after async gaps in click handlers.
 */
export function openExternal(url: string): void {
  const normalised = normalizeMediaUrl(url);

  if (Capacitor.isNativePlatform()) {
    void Browser.open({ url: normalised });
    return;
  }

  try {
    const a = document.createElement('a');
    a.href = normalised;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    window.open(normalised, '_blank', 'noopener,noreferrer');
  }
}
