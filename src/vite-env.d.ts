/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  /** Supabase Project Settings → API → anon (public) key */
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  /** Spotify Developer Dashboard — required for Connect */
  readonly VITE_SPOTIFY_CLIENT_ID?: string;
  /** Google Cloud OAuth client — required for YouTube readonly Connect */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** Optional override for Spotify/Google OAuth redirect (native / custom URL scheme) */
  readonly VITE_MEDIA_OAUTH_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
