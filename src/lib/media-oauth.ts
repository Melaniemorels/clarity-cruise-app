/**
 * Spotify / Google (YouTube) OAuth URL builders for web and Capacitor WebView.
 * Redirect URIs must match developer console entries (Spotify Dashboard, Google Cloud OAuth client).
 */

const SPOTIFY_SCOPES = [
  "user-top-read",
  "user-read-recently-played",
  "user-library-read",
  "playlist-read-private",
].join(" ");

const GOOGLE_YT_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

const OAUTH_STATE_KEY = "vyv_media_oauth_state";

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function setOAuthState(provider: "spotify" | "youtube"): string {
  const state = `${provider}:${randomId()}`;
  try {
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
  } catch {
    /* ignore quota / private mode */
  }
  return state;
}

/** Validates OAuth `state` against the value stored when starting Connect; returns provider or null. */
export function consumeMediaOAuthState(
  returnedState: string | null,
): "spotify" | "youtube" | null {
  if (!returnedState) return null;
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(OAUTH_STATE_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);
  } catch {
    return null;
  }
  if (!stored || stored !== returnedState) return null;
  if (returnedState.startsWith("spotify:")) return "spotify";
  if (returnedState.startsWith("youtube:")) return "youtube";
  return null;
}

/**
 * Must match the redirect URI registered in Spotify Dashboard and Google Cloud OAuth client.
 * Optional `VITE_MEDIA_OAUTH_REDIRECT_URI` for Capacitor / custom schemes (e.g. com.app.id://path).
 */
export function getMediaOAuthRedirectUri(): string {
  const override = import.meta.env.VITE_MEDIA_OAUTH_REDIRECT_URI?.trim();
  if (override) return override;
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/media-connections`;
}

export function buildSpotifyAuthorizeUrl(): string | null {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim();
  if (!clientId) return null;
  const redirectUri = getMediaOAuthRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    show_dialog: "true",
    state: setOAuthState("spotify"),
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export function buildGoogleYouTubeAuthorizeUrl(): string | null {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return null;
  const redirectUri = getMediaOAuthRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: GOOGLE_YT_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: setOAuthState("youtube"),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
