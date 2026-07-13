// Spotify OAuth for per-user media connections (mirrors routes/media.ts).
//
// Flow: the frontend navigates (top-level, cookie-authenticated) to
// GET /media/spotify/connect → 302 to Spotify's consent screen → Spotify
// redirects back to GET /media/spotify/callback → we exchange the code,
// store the tokens server-side in media_integrations (tokens are NEVER
// exposed to the browser; the REST shim redacts them) and bounce the user
// back to /media-connections.
import crypto from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, mediaIntegrations, exploreItems } from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import {
  classifyHealthy,
  isBlockedContent,
  type HealthyCategory,
} from "../lib/healthy";

const router: IRouter = Router();

// Read-only scopes: saved shows/tracks + private playlists + top items.
const SPOTIFY_SCOPE = "user-library-read playlist-read-private user-top-read";
const STATE_TTL_MS = 10 * 60 * 1000;
const SYNC_STALE_MS = 12 * 60 * 60 * 1000; // re-sync at most every 12h

function clientId(): string {
  return process.env.SPOTIFY_CLIENT_ID ?? "";
}
function clientSecret(): string {
  return process.env.SPOTIFY_CLIENT_SECRET ?? "";
}
function redirectUri(): string {
  // In production REPLIT_DOMAINS holds the deployed domain(s); in the dev
  // container it is the .replit.dev preview, same as REPLIT_DEV_DOMAIN.
  const domain =
    process.env.NODE_ENV === "production"
      ? ((process.env.REPLIT_DOMAINS ?? "").split(",")[0] ?? "")
      : (process.env.REPLIT_DEV_DOMAIN ?? "");
  return `https://${domain}/api/media/spotify/callback`;
}
function basicAuth(): string {
  return Buffer.from(`${clientId()}:${clientSecret()}`).toString("base64");
}

// -- Signed, stateless OAuth `state` (HMAC over userId + expiry) -------------

function signState(userId: string): string {
  const exp = Date.now() + STATE_TTL_MS;
  const payload = `${userId}.${exp}`;
  const sig = crypto
    .createHmac("sha256", clientSecret())
    .update(payload)
    .digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

function verifyState(state: string): string | null {
  const [encoded, sig] = state.split(".");
  if (!encoded || !sig) return null;
  const payload = Buffer.from(encoded, "base64url").toString();
  const expected = crypto
    .createHmac("sha256", clientSecret())
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const lastDot = payload.lastIndexOf(".");
  const userId = payload.slice(0, lastDot);
  const exp = Number(payload.slice(lastDot + 1));
  if (!userId || !Number.isFinite(exp) || Date.now() > exp) return null;
  return userId;
}

// -- Connect: kick off Spotify consent ----------------------------------------

router.get(
  "/media/spotify/connect",
  requireUser,
  (req: Request, res: Response) => {
    if (!clientId() || !clientSecret()) {
      res.status(503).json({ error: "Spotify OAuth is not configured" });
      return;
    }
    const params = new URLSearchParams({
      client_id: clientId(),
      redirect_uri: redirectUri(),
      response_type: "code",
      scope: SPOTIFY_SCOPE,
      state: signState(req.authUser!.id),
      show_dialog: "false",
    });
    res.redirect(
      `https://accounts.spotify.com/authorize?${params.toString()}`,
    );
  },
);

// -- Callback: exchange code, persist tokens ---------------------------------

router.get(
  "/media/spotify/callback",
  async (req: Request, res: Response) => {
    const back = (q: string) => res.redirect(`/media-connections?${q}`);
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      back(`error=${encodeURIComponent(error)}`);
      return;
    }
    const userId = state ? verifyState(state) : null;
    if (!userId || !code) {
      back("error=invalid_state");
      return;
    }

    try {
      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth()}`,
        },
        body: new URLSearchParams({
          code,
          redirect_uri: redirectUri(),
          grant_type: "authorization_code",
        }),
      });
      const tokens = (await tokenRes.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        error?: string;
      };
      if (!tokenRes.ok || !tokens.access_token) {
        req.log?.error({ tokens }, "spotify token exchange failed");
        back("error=token_exchange_failed");
        return;
      }

      const expiresAt = new Date(
        Date.now() + (tokens.expires_in ?? 3600) * 1000,
      );
      await db
        .insert(mediaIntegrations)
        .values({
          user_id: userId,
          provider: "spotify",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          is_active: true,
          scopes: SPOTIFY_SCOPE.split(" "),
          connected_at: new Date(),
          token_expires_at: expiresAt,
        })
        .onConflictDoUpdate({
          target: [mediaIntegrations.user_id, mediaIntegrations.provider],
          set: {
            access_token: tokens.access_token,
            ...(tokens.refresh_token
              ? { refresh_token: tokens.refresh_token }
              : {}),
            is_active: true,
            scopes: SPOTIFY_SCOPE.split(" "),
            connected_at: new Date(),
            token_expires_at: expiresAt,
            updated_at: new Date(),
          },
        });

      // Fill the Explorer with real wellness audio right after connecting.
      syncSpotifyHealthy(userId).catch((err) =>
        req.log?.error({ err }, "post-connect spotify sync failed"),
      );

      back("connected=spotify");
    } catch (err) {
      req.log?.error({ err }, "spotify oauth callback failed");
      back("error=callback_failed");
    }
  },
);

// -- Server-side token access (refresh when expired) -------------------------

export async function getSpotifyAccessToken(
  userId: string,
): Promise<string | null> {
  const rows = await db
    .select()
    .from(mediaIntegrations)
    .where(
      and(
        eq(mediaIntegrations.user_id, userId),
        eq(mediaIntegrations.provider, "spotify"),
        eq(mediaIntegrations.is_active, true),
      ),
    );
  const row = rows[0];
  if (!row?.access_token) return null;

  const expiresAt = row.token_expires_at
    ? new Date(row.token_expires_at).getTime()
    : 0;
  if (expiresAt > Date.now() + 60_000) return row.access_token;

  if (!row.refresh_token) return null;
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth()}`,
    },
    body: new URLSearchParams({
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!tokenRes.ok || !tokens.access_token) return null;

  await db
    .update(mediaIntegrations)
    .set({
      access_token: tokens.access_token,
      // Spotify occasionally rotates the refresh token — keep the new one.
      ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      token_expires_at: new Date(
        Date.now() + (tokens.expires_in ?? 3600) * 1000,
      ),
      updated_at: new Date(),
    })
    .where(eq(mediaIntegrations.id, row.id));
  return tokens.access_token;
}

async function spGet(
  accessToken: string,
  path: string,
  params?: Record<string, string>,
): Promise<any> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  const res = await fetch(`https://api.spotify.com/v1/${path}${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Spotify API ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

// -- Library summary: saved shows + playlists --------------------------------

router.get(
  "/media/spotify/library",
  requireUser,
  async (req: Request, res: Response) => {
    try {
      const token = await getSpotifyAccessToken(req.authUser!.id);
      if (!token) {
        res.status(404).json({ error: "Spotify is not connected" });
        return;
      }

      const [shows, playlists] = await Promise.all([
        spGet(token, "me/shows", { limit: "25" }),
        spGet(token, "me/playlists", { limit: "25" }),
      ]);

      res.json({
        shows: (shows.items ?? []).map((it: any) => ({
          id: it.show?.id,
          title: it.show?.name,
          publisher: it.show?.publisher,
          thumbnail: it.show?.images?.[1]?.url ?? it.show?.images?.[0]?.url ?? null,
          url: it.show?.external_urls?.spotify ?? null,
        })),
        playlists: (playlists.items ?? []).map((p: any) => ({
          id: p.id,
          title: p.name,
          itemCount: p.tracks?.total ?? 0,
          url: p.external_urls?.spotify ?? null,
        })),
      });
    } catch (err) {
      req.log?.error({ err }, "spotify library fetch failed");
      res.status(502).json({ error: "Failed to fetch Spotify library" });
    }
  },
);

// -- Healthy-content sync: real Spotify audio → explore_items -----------------
//
// Pulls the user's saved podcasts plus curated wellness episode searches, runs
// the healthy classifier over everything, and inserts only wellness content
// into explore_items (deduped by url).

// Audio-native wellness searches (episodes have real durations, which lets the
// calendar gap-fitting work). Categories match the frontend carousel keys.
const EPISODE_SEARCH_QUERIES: Partial<Record<HealthyCategory, string>> = {
  "Meditación": "meditación guiada",
  Calma: "relajación para dormir",
  Motivacional: "motivación personal podcast",
  Podcasts: "podcast bienestar salud",
  "Nutrición": "nutrición alimentación saludable",
  "Energía": "hábitos energía mañana",
  Yoga: "yoga nidra relajación guiada",
  PlanesDeComida: "meal prep planificación comidas saludables",
  "Música": "música relajante para dormir y concentrarse",
  Audiolibros: "audiolibro desarrollo personal completo",
};

// English counterparts so users with the app in English get English content.
const EPISODE_SEARCH_QUERIES_EN: Partial<Record<HealthyCategory, string>> = {
  "Meditación": "guided meditation",
  Calma: "relaxation for sleep",
  Motivacional: "personal motivation podcast",
  Podcasts: "wellness health podcast",
  "Nutrición": "nutrition healthy eating",
  "Energía": "morning energy habits",
  Yoga: "yoga nidra guided relaxation",
  PlanesDeComida: "meal prep healthy weekly plan",
  "Música": "relaxing music for sleep and focus",
  Audiolibros: "personal development audiobook",
};

// Second-pass queries for sections the classifier tends to leave thin (many
// results of the primary query get reclassified into Meditación/Calma).
// Only used by the app-level catalogue sync.
const EXTRA_EPISODE_QUERIES: [HealthyCategory, string][] = [
  ["Podcasts", "podcast crecimiento personal español"],
  ["Podcasts", "podcast psicología positiva"],
  ["Música", "playlist sonidos para concentración estudio"],
  ["Música", "música instrumental bienestar"],
  ["PlanesDeComida", "plan semanal de comidas batch cooking"],
  ["Audiolibros", "audiolibro hábitos español"],
];

const EXTRA_EPISODE_QUERIES_EN: [HealthyCategory, string][] = [
  ["Podcasts", "personal growth podcast"],
  ["Podcasts", "positive psychology podcast"],
  ["Música", "focus sounds study playlist"],
  ["Música", "instrumental wellness music"],
  ["PlanesDeComida", "weekly meal plan batch cooking"],
  ["Audiolibros", "habits audiobook"],
];

interface CandidateItem {
  title: string;
  url: string;
  category: HealthyCategory;
  duration_min: number | null;
  creator: string | null;
  thumbnail: string | null;
  tags: string[];
  language: string | null;
}

/** Run the curated wellness episode searches for the given categories. */
async function searchHealthyEpisodes(
  token: string,
  entries: [HealthyCategory, string][],
  lang: "es" | "en" = "es",
): Promise<CandidateItem[]> {
  const candidates: CandidateItem[] = [];
  for (const [category, query] of entries) {
    try {
      const found = await spGet(token, "search", {
        q: query,
        type: "episode",
        // Spotify rejects larger limits on episode search ("Invalid limit").
        limit: "8",
        // Required for app (client-credentials) tokens — without a market the
        // search returns null items. Harmless with user tokens.
        market: lang === "en" ? "US" : "ES",
      });
      for (const ep of found.episodes?.items ?? []) {
        if (!ep?.id || !ep?.name) continue;
        // Strict healthy-only: the searched-category fallback must never
        // rescue content that matches a hard blocker.
        if (isBlockedContent(ep.name, [ep.description ?? ""])) continue;
        const cat =
          classifyHealthy(ep.name, [ep.description ?? ""]) ?? category;
        candidates.push({
          title: ep.name,
          url:
            ep.external_urls?.spotify ??
            `https://open.spotify.com/episode/${ep.id}`,
          category: cat,
          duration_min: ep.duration_ms
            ? Math.max(1, Math.round(ep.duration_ms / 60000))
            : null,
          creator: null,
          thumbnail: ep.images?.[1]?.url ?? ep.images?.[0]?.url ?? null,
          tags: [cat.toLowerCase(), "spotify", "bienestar"],
          language: ep.language?.startsWith("es")
            ? "es"
            : ep.languages?.some((l: string) => l.startsWith("es"))
              ? "es"
              : ep.language?.startsWith("en")
                ? "en"
                : ep.languages?.some((l: string) => l.startsWith("en"))
                  ? "en"
                  : lang,
        });
      }
    } catch {
      // One category failing must not abort the whole sync.
    }
  }
  return candidates;
}

/** Dedupe against the existing catalogue and insert the fresh items. */
async function insertSpotifyCandidates(
  candidates: CandidateItem[],
): Promise<number> {
  const byUrl = new Map<string, CandidateItem>();
  for (const c of candidates) if (!byUrl.has(c.url)) byUrl.set(c.url, c);
  const urls = [...byUrl.keys()];
  if (urls.length === 0) return 0;

  const existing = await db
    .select({ url: exploreItems.url })
    .from(exploreItems)
    .where(inArray(exploreItems.url, urls));
  const existingUrls = new Set(existing.map((r) => r.url));

  const fresh = urls
    .filter((u) => !existingUrls.has(u))
    .map((u) => byUrl.get(u)!)
    .map((c) => ({
      title: c.title,
      source: "spotify",
      url: c.url,
      duration_min: c.duration_min,
      category: c.category,
      tags: c.tags,
      language: c.language,
      creator: c.creator,
      thumbnail: c.thumbnail,
      is_verified: true,
      popularity_score: 0.6,
    }));

  // Idempotent under concurrent syncs: explore_items.url is unique.
  if (fresh.length > 0)
    await db
      .insert(exploreItems)
      .values(fresh)
      .onConflictDoNothing({ target: exploreItems.url });

  return fresh.length;
}

// -- App-level (client-credentials) catalogue sync ----------------------------
//
// The Explorer catalogue is global, so it must not depend on any single user
// connecting Spotify. When nobody is connected yet, we use the app's own
// credentials to search Spotify's public catalogue for wellness episodes.

let cachedAppToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyAppToken(): Promise<string | null> {
  if (!clientId() || !clientSecret()) return null;
  if (cachedAppToken && cachedAppToken.expiresAt > Date.now() + 60_000)
    return cachedAppToken.token;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth()}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!res.ok || !data.access_token) return null;
  cachedAppToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedAppToken.token;
}

let lastCatalogSyncAt = 0;
let catalogSyncInFlight = false;

export async function syncSpotifyCatalog(): Promise<{
  scanned: number;
  inserted: number;
}> {
  const token = await getSpotifyAppToken();
  if (!token) return { scanned: 0, inserted: 0 };

  // App-level syncs cover ALL audio categories in one pass plus the
  // second-pass queries for the thin sections, in BOTH catalogue languages
  // (~32 searches, well inside Spotify's rate limits, and only every 12h).
  const entriesEs = (
    Object.entries(EPISODE_SEARCH_QUERIES) as [HealthyCategory, string][]
  ).concat(EXTRA_EPISODE_QUERIES);
  const entriesEn = (
    Object.entries(EPISODE_SEARCH_QUERIES_EN) as [HealthyCategory, string][]
  ).concat(EXTRA_EPISODE_QUERIES_EN);
  const candidates = [
    ...(await searchHealthyEpisodes(token, entriesEs, "es")),
    ...(await searchHealthyEpisodes(token, entriesEn, "en")),
  ];
  const inserted = await insertSpotifyCandidates(candidates);
  lastCatalogSyncAt = Date.now();
  return { scanned: candidates.length, inserted };
}

export async function syncSpotifyHealthy(
  userId: string,
  opts: { includePersonal?: boolean } = {},
): Promise<{
  scanned: number;
  inserted: number;
}> {
  // Personal library (saved shows) may only feed the shared catalogue when
  // the sync runs on behalf of the account owner themself.
  const includePersonal = opts.includePersonal ?? true;
  const token = await getSpotifyAccessToken(userId);
  if (!token) return { scanned: 0, inserted: 0 };

  const candidates: CandidateItem[] = [];

  // 1) The user's saved podcasts → keep only the healthy ones.
  if (includePersonal) {
    try {
      const shows = await spGet(token, "me/shows", { limit: "50" });
      for (const it of shows.items ?? []) {
        const show = it.show;
        if (!show?.id || !show?.name) continue;
        const category = classifyHealthy(show.name, [
          show.publisher ?? "",
          show.description ?? "",
        ]);
        if (!category) continue;
        candidates.push({
          title: show.name,
          url:
            show.external_urls?.spotify ??
            `https://open.spotify.com/show/${show.id}`,
          category,
          duration_min: null,
          creator: show.publisher ?? null,
          thumbnail: show.images?.[1]?.url ?? show.images?.[0]?.url ?? null,
          tags: [category.toLowerCase(), "spotify", "bienestar"],
          language: show.languages?.some((l: string) => l.startsWith("es"))
            ? "es"
            : null,
        });
      }
    } catch {
      // Saved shows are optional — keep going with searches.
    }
  }

  // 2) Curated wellness episode searches (rotate 3 categories per sync to
  // stay well inside Spotify's rate limits; the window advances every 12h
  // and covers BOTH language query sets across successive syncs).
  const allEntries: [HealthyCategory, string, "es" | "en"][] = [
    ...(
      Object.entries(EPISODE_SEARCH_QUERIES) as [HealthyCategory, string][]
    ).map(([c, q]): [HealthyCategory, string, "es" | "en"] => [c, q, "es"]),
    ...(
      Object.entries(EPISODE_SEARCH_QUERIES_EN) as [HealthyCategory, string][]
    ).map(([c, q]): [HealthyCategory, string, "es" | "en"] => [c, q, "en"]),
  ];
  const CATEGORIES_PER_SYNC = 3;
  const offset =
    (Math.floor(Date.now() / SYNC_STALE_MS) * CATEGORIES_PER_SYNC) %
    allEntries.length;
  const searchEntries = Array.from(
    { length: CATEGORIES_PER_SYNC },
    (_, i) => allEntries[(offset + i) % allEntries.length],
  );
  for (const [category, query, lang] of searchEntries) {
    candidates.push(
      ...(await searchHealthyEpisodes(token, [[category, query]], lang)),
    );
  }

  // 3) Dedupe against what is already in the catalogue and insert the rest.
  const inserted = await insertSpotifyCandidates(candidates);

  await db
    .update(mediaIntegrations)
    .set({ last_sync_at: new Date(), updated_at: new Date() })
    .where(
      and(
        eq(mediaIntegrations.user_id, userId),
        eq(mediaIntegrations.provider, "spotify"),
      ),
    );

  return { scanned: candidates.length, inserted };
}

/**
 * Fire-and-forget sync that keeps the global catalogue stocked:
 * 1. Prefer the requesting user's own connection (includes their saved shows).
 * 2. Otherwise any active connection — the catalogue is shared by everyone.
 * 3. If nobody has connected Spotify yet, fall back to the app-level
 *    client-credentials catalogue sync so the Explorer is never empty.
 */
export async function maybeSyncSpotifyHealthy(userId: string): Promise<void> {
  let rows = await db
    .select({
      user_id: mediaIntegrations.user_id,
      last_sync_at: mediaIntegrations.last_sync_at,
    })
    .from(mediaIntegrations)
    .where(
      and(
        eq(mediaIntegrations.user_id, userId),
        eq(mediaIntegrations.provider, "spotify"),
        eq(mediaIntegrations.is_active, true),
      ),
    );

  if (rows.length === 0) {
    rows = await db
      .select({
        user_id: mediaIntegrations.user_id,
        last_sync_at: mediaIntegrations.last_sync_at,
      })
      .from(mediaIntegrations)
      .where(
        and(
          eq(mediaIntegrations.provider, "spotify"),
          eq(mediaIntegrations.is_active, true),
        ),
      )
      .orderBy(sql`${mediaIntegrations.last_sync_at} ASC NULLS FIRST`)
      .limit(1);
  }

  const row = rows[0];
  if (row) {
    const last = row.last_sync_at ? new Date(row.last_sync_at).getTime() : 0;
    if (Date.now() - last < SYNC_STALE_MS) return;
    // Privacy: personal library (saved shows) only feeds the shared
    // catalogue when the sync runs for the requesting user themself.
    await syncSpotifyHealthy(row.user_id, {
      includePersonal: row.user_id === userId,
    });
    return;
  }

  // Nobody connected yet — app-level catalogue sync, throttled to 12h.
  if (catalogSyncInFlight || Date.now() - lastCatalogSyncAt < SYNC_STALE_MS)
    return;
  const newest = await db
    .select({ created_at: exploreItems.created_at })
    .from(exploreItems)
    .where(eq(exploreItems.source, "spotify"))
    .orderBy(desc(exploreItems.created_at))
    .limit(1);
  const newestAt = newest[0]?.created_at
    ? new Date(newest[0].created_at).getTime()
    : 0;
  if (Date.now() - newestAt < SYNC_STALE_MS) {
    lastCatalogSyncAt = Date.now();
    return;
  }
  catalogSyncInFlight = true;
  try {
    await syncSpotifyCatalog();
  } finally {
    catalogSyncInFlight = false;
  }
}

router.post(
  "/media/spotify/sync",
  requireUser,
  async (req: Request, res: Response) => {
    try {
      const result = await syncSpotifyHealthy(req.authUser!.id);
      res.json(result);
    } catch (err) {
      req.log?.error({ err }, "spotify healthy sync failed");
      res.status(502).json({ error: "Sync failed" });
    }
  },
);

export default router;
