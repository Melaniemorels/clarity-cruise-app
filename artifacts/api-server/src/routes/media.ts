// YouTube (Google) OAuth for per-user media connections.
//
// Flow: the frontend navigates (top-level, cookie-authenticated) to
// GET /media/youtube/connect → 302 to Google's consent screen → Google
// redirects back to GET /media/youtube/callback → we exchange the code,
// store the tokens server-side in media_integrations (tokens are NEVER
// exposed to the browser; the REST shim redacts them) and bounce the user
// back to /media-connections.
import crypto from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, mediaIntegrations, exploreItems } from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import { explorerEnabled } from "../lib/featureFlags";
import { encryptToken, decryptToken } from "../lib/tokenCrypto";
import { refineCandidatesWithAI } from "../lib/itemClassifier";
import {
  classifyHealthy,
  isBlockedContent,
  isoDurationToMinutes,
  CATEGORY_SEARCH_QUERIES,
  CATEGORY_SEARCH_QUERIES_EN,
  type HealthyCategory,
} from "../lib/healthy";

const router: IRouter = Router();

const YT_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const STATE_TTL_MS = 10 * 60 * 1000;

function clientId(): string {
  return process.env.YOUTUBE_CLIENT_ID ?? "";
}
function clientSecret(): string {
  return process.env.YOUTUBE_CLIENT_SECRET ?? "";
}
function redirectUri(): string {
  // In production REPLIT_DOMAINS holds the deployed domain(s); in the dev
  // container it is the .replit.dev preview, same as REPLIT_DEV_DOMAIN.
  const domain =
    process.env.NODE_ENV === "production"
      ? ((process.env.REPLIT_DOMAINS ?? "").split(",")[0] ?? "")
      : (process.env.REPLIT_DEV_DOMAIN ?? "");
  return `https://${domain}/api/media/youtube/callback`;
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

// -- Connect: kick off Google consent ----------------------------------------

router.get(
  "/media/youtube/connect",
  requireUser,
  (req: Request, res: Response) => {
    if (!explorerEnabled()) {
      res.status(403).json({ error: "Explorer is disabled" });
      return;
    }
    if (!clientId() || !clientSecret()) {
      res.status(503).json({ error: "YouTube OAuth is not configured" });
      return;
    }
    const params = new URLSearchParams({
      client_id: clientId(),
      redirect_uri: redirectUri(),
      response_type: "code",
      scope: YT_SCOPE,
      access_type: "offline",
      prompt: "consent",
      state: signState(req.authUser!.id),
    });
    res.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    );
  },
);

// -- Callback: exchange code, persist tokens ---------------------------------

router.get(
  "/media/youtube/callback",
  async (req: Request, res: Response) => {
    const back = (q: string) => res.redirect(`/media-connections?${q}`);
    if (!explorerEnabled()) {
      back("error=explorer_disabled");
      return;
    }
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
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId(),
          client_secret: clientSecret(),
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
        req.log?.error({ tokens }, "youtube token exchange failed");
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
          provider: "youtube",
          access_token: encryptToken(tokens.access_token),
          refresh_token: encryptToken(tokens.refresh_token ?? null),
          is_active: true,
          scopes: [YT_SCOPE],
          connected_at: new Date(),
          token_expires_at: expiresAt,
        })
        .onConflictDoUpdate({
          target: [mediaIntegrations.user_id, mediaIntegrations.provider],
          set: {
            access_token: encryptToken(tokens.access_token),
            // Google only re-sends the refresh_token with prompt=consent;
            // keep whatever we got (it is always present on first consent).
            ...(tokens.refresh_token
              ? { refresh_token: encryptToken(tokens.refresh_token) }
              : {}),
            is_active: true,
            scopes: [YT_SCOPE],
            connected_at: new Date(),
            token_expires_at: expiresAt,
            updated_at: new Date(),
          },
        });

      // Kick off the healthy-content sync in the background so the Explorer
      // fills up with real wellness content right after connecting.
      syncYouTubeHealthy(userId).catch((err) =>
        req.log?.error({ err }, "post-connect youtube sync failed"),
      );

      back("connected=youtube");
    } catch (err) {
      req.log?.error({ err }, "youtube oauth callback failed");
      back("error=callback_failed");
    }
  },
);

// -- Server-side token access (refresh when expired) -------------------------

export async function getYouTubeAccessToken(
  userId: string,
): Promise<string | null> {
  const rows = await db
    .select()
    .from(mediaIntegrations)
    .where(
      and(
        eq(mediaIntegrations.user_id, userId),
        eq(mediaIntegrations.provider, "youtube"),
        eq(mediaIntegrations.is_active, true),
      ),
    );
  const row = rows[0];
  if (!row?.access_token) return null;

  const expiresAt = row.token_expires_at
    ? new Date(row.token_expires_at).getTime()
    : 0;
  if (expiresAt > Date.now() + 60_000) return decryptToken(row.access_token);

  const refreshToken = decryptToken(row.refresh_token);
  if (!refreshToken) return null;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "refresh_token",
    }),
  });
  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!tokenRes.ok || !tokens.access_token) return null;

  await db
    .update(mediaIntegrations)
    .set({
      access_token: encryptToken(tokens.access_token),
      token_expires_at: new Date(
        Date.now() + (tokens.expires_in ?? 3600) * 1000,
      ),
      updated_at: new Date(),
    })
    .where(eq(mediaIntegrations.id, row.id));
  return tokens.access_token;
}

async function ytGet(
  accessToken: string,
  path: string,
  params: Record<string, string>,
): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/${path}?${qs}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`YouTube API ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

// -- Library summary: likes, subscriptions, playlists ------------------------

router.get(
  "/media/youtube/library",
  requireUser,
  async (req: Request, res: Response) => {
    try {
      const token = await getYouTubeAccessToken(req.authUser!.id);
      if (!token) {
        res.status(404).json({ error: "YouTube is not connected" });
        return;
      }

      const [likes, subs, playlists] = await Promise.all([
        ytGet(token, "videos", {
          part: "snippet,contentDetails",
          myRating: "like",
          maxResults: "25",
        }),
        ytGet(token, "subscriptions", {
          part: "snippet",
          mine: "true",
          maxResults: "25",
        }),
        ytGet(token, "playlists", {
          part: "snippet,contentDetails",
          mine: "true",
          maxResults: "25",
        }),
      ]);

      res.json({
        likes: (likes.items ?? []).map((v: any) => ({
          id: v.id,
          title: v.snippet?.title,
          channel: v.snippet?.channelTitle,
          thumbnail:
            v.snippet?.thumbnails?.medium?.url ??
            v.snippet?.thumbnails?.default?.url ??
            null,
          duration: v.contentDetails?.duration ?? null,
          url: `https://www.youtube.com/watch?v=${v.id}`,
        })),
        subscriptions: (subs.items ?? []).map((s: any) => ({
          channelId: s.snippet?.resourceId?.channelId,
          title: s.snippet?.title,
          thumbnail: s.snippet?.thumbnails?.default?.url ?? null,
        })),
        playlists: (playlists.items ?? []).map((p: any) => ({
          id: p.id,
          title: p.snippet?.title,
          itemCount: p.contentDetails?.itemCount ?? 0,
          url: `https://www.youtube.com/playlist?list=${p.id}`,
        })),
      });
    } catch (err) {
      req.log?.error({ err }, "youtube library fetch failed");
      res.status(502).json({ error: "Failed to fetch YouTube library" });
    }
  },
);

// -- Healthy-content sync: real YouTube videos → explore_items ---------------
//
// Pulls the user's liked videos plus per-category wellness searches, runs the
// healthy classifier over everything, and inserts only wellness content into
// explore_items (deduped by url). Non-healthy content never enters the feed.

const SYNC_STALE_MS = 12 * 60 * 60 * 1000; // re-sync at most every 12h

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

function videoToCandidate(
  v: any,
  fallbackCategory?: HealthyCategory,
  fallbackLang?: string,
): CandidateItem | null {
  const id = typeof v.id === "string" ? v.id : v.id?.videoId;
  const sn = v.snippet;
  if (!id || !sn?.title) return null;
  const extras = [sn.channelTitle ?? "", sn.description ?? ""];
  // Strict healthy-only: the searched-category fallback must never rescue
  // content that matches a hard blocker.
  if (isBlockedContent(sn.title, extras)) return null;
  const category =
    classifyHealthy(sn.title, extras) ?? fallbackCategory ?? null;
  if (!category) return null;
  return {
    title: sn.title,
    url: `https://www.youtube.com/watch?v=${id}`,
    category,
    duration_min: isoDurationToMinutes(v.contentDetails?.duration),
    creator: sn.channelTitle ?? null,
    thumbnail:
      sn.thumbnails?.medium?.url ?? sn.thumbnails?.default?.url ?? null,
    tags: [category.toLowerCase(), "youtube", "bienestar"],
    language:
      sn.defaultAudioLanguage?.startsWith("es") ||
      sn.defaultLanguage?.startsWith("es")
        ? "es"
        : sn.defaultAudioLanguage?.startsWith("en") ||
            sn.defaultLanguage?.startsWith("en")
          ? "en"
          : (fallbackLang ?? null),
  };
}

export async function syncYouTubeHealthy(
  userId: string,
  opts: { includePersonal?: boolean } = {},
): Promise<{
  scanned: number;
  inserted: number;
}> {
  try {
    return await syncYouTubeHealthyInner(userId, opts);
  } catch (err) {
    await db
      .update(mediaIntegrations)
      .set({
        last_sync_status: "error",
        last_sync_error:
          err instanceof Error ? err.message.slice(0, 500) : "sync failed",
        updated_at: new Date(),
      })
      .where(
        and(
          eq(mediaIntegrations.user_id, userId),
          eq(mediaIntegrations.provider, "youtube"),
        ),
      )
      .catch(() => {});
    throw err;
  }
}

async function syncYouTubeHealthyInner(
  userId: string,
  opts: { includePersonal?: boolean } = {},
): Promise<{
  scanned: number;
  inserted: number;
}> {
  // Personal data (liked videos) may only feed the shared catalogue when
  // the sync runs on behalf of the account owner themself.
  const includePersonal = opts.includePersonal ?? true;
  const token = await getYouTubeAccessToken(userId);
  if (!token) return { scanned: 0, inserted: 0 };

  const candidates: CandidateItem[] = [];

  // 1) The user's liked videos → keep only the healthy ones.
  if (includePersonal) {
    try {
      const likes = await ytGet(token, "videos", {
        part: "snippet,contentDetails",
        myRating: "like",
        maxResults: "50",
      });
      for (const v of likes.items ?? []) {
        const c = videoToCandidate(v);
        if (c) candidates.push(c);
      }
    } catch {
      // Likes are optional — keep going with searches.
    }
  }

  // 2) Curated wellness searches per category (real, current videos).
  // Quota control: search.list costs 100 units/call, so rotate a subset of
  // 4 categories per sync instead of hitting all every time. The rotation
  // window advances every 12h and covers BOTH language query sets, so the
  // catalogue fills with Spanish and English content over successive syncs.
  const allEntries: [HealthyCategory, string, "es" | "en"][] = [
    ...(Object.entries(CATEGORY_SEARCH_QUERIES) as [HealthyCategory, string][])
      .map(([c, q]): [HealthyCategory, string, "es" | "en"] => [c, q, "es"]),
    ...(
      Object.entries(CATEGORY_SEARCH_QUERIES_EN) as [HealthyCategory, string][]
    ).map(([c, q]): [HealthyCategory, string, "es" | "en"] => [c, q, "en"]),
  ];
  const CATEGORIES_PER_SYNC = 4;
  const offset =
    (Math.floor(Date.now() / SYNC_STALE_MS) * CATEGORIES_PER_SYNC) %
    allEntries.length;
  const searchEntries = Array.from(
    { length: CATEGORIES_PER_SYNC },
    (_, i) => allEntries[(offset + i) % allEntries.length],
  );
  for (const [category, query, lang] of searchEntries) {
    try {
      const found = await ytGet(token, "search", {
        part: "snippet",
        q: query,
        type: "video",
        maxResults: "8",
        safeSearch: "strict",
        relevanceLanguage: lang,
      });
      const ids = (found.items ?? [])
        .map((it: any) => it.id?.videoId)
        .filter(Boolean);
      if (ids.length === 0) continue;
      // Fetch durations + full snippets for the found ids.
      const details = await ytGet(token, "videos", {
        part: "snippet,contentDetails",
        id: ids.join(","),
      });
      for (const v of details.items ?? []) {
        const c = videoToCandidate(v, category, lang);
        if (c) candidates.push(c);
      }
    } catch {
      // One category failing must not abort the whole sync.
    }
  }

  // 3) Dedupe against what is already in the catalogue and insert the rest.
  const byUrl = new Map<string, CandidateItem>();
  for (const c of candidates) if (!byUrl.has(c.url)) byUrl.set(c.url, c);
  const urls = [...byUrl.keys()];
  if (urls.length === 0) return { scanned: candidates.length, inserted: 0 };

  const existing = await db
    .select({ url: exploreItems.url })
    .from(exploreItems)
    .where(inArray(exploreItems.url, urls));
  const existingUrls = new Set(existing.map((r) => r.url));

  const freshCandidates = urls
    .filter((u) => !existingUrls.has(u))
    .map((u) => byUrl.get(u)!);

  // AI pass refines category + language on the NEW items only (best-effort:
  // rules-based values survive any AI failure; no items are added or dropped).
  const refined = await refineCandidatesWithAI(freshCandidates);

  const fresh = refined.map((c) => ({
    title: c.title,
    source: "youtube",
    url: c.url,
    duration_min: c.duration_min,
    category: c.category,
    tags: [c.category.toLowerCase(), "youtube", "bienestar"],
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

  await db
    .update(mediaIntegrations)
    .set({
      last_sync_at: new Date(),
      last_sync_status: "ok",
      last_sync_error: null,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(mediaIntegrations.user_id, userId),
        eq(mediaIntegrations.provider, "youtube"),
      ),
    );

  return { scanned: candidates.length, inserted: fresh.length };
}

/**
 * Fire-and-forget sync that keeps the global catalogue stocked. Prefers the
 * requesting user's own connection (includes their likes); otherwise falls
 * back to any active YouTube connection — the catalogue is shared by
 * everyone, so a single linked account keeps all Explorers filled.
 */
export async function maybeSyncYouTubeHealthy(userId: string): Promise<void> {
  let rows = await db
    .select({
      user_id: mediaIntegrations.user_id,
      last_sync_at: mediaIntegrations.last_sync_at,
    })
    .from(mediaIntegrations)
    .where(
      and(
        eq(mediaIntegrations.user_id, userId),
        eq(mediaIntegrations.provider, "youtube"),
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
          eq(mediaIntegrations.provider, "youtube"),
          eq(mediaIntegrations.is_active, true),
        ),
      )
      .orderBy(sql`${mediaIntegrations.last_sync_at} ASC NULLS FIRST`)
      .limit(1);
  }

  const row = rows[0];
  if (!row) return;
  const last = row.last_sync_at ? new Date(row.last_sync_at).getTime() : 0;
  if (Date.now() - last < SYNC_STALE_MS) return;
  // Privacy: personal data (likes) only feeds the shared catalogue when the
  // sync runs for the requesting user themself.
  await syncYouTubeHealthy(row.user_id, {
    includePersonal: row.user_id === userId,
  });
}

router.post(
  "/media/youtube/sync",
  requireUser,
  async (req: Request, res: Response) => {
    if (!explorerEnabled()) {
      res.status(403).json({ error: "Explorer is disabled" });
      return;
    }
    try {
      const result = await syncYouTubeHealthy(req.authUser!.id);
      res.json(result);
    } catch (err) {
      req.log?.error({ err }, "youtube healthy sync failed");
      res.status(502).json({ error: "Sync failed" });
    }
  },
);

// -- Honest per-provider connection status ------------------------------------
// Derived server-side from the stored row — never from whether content cards
// happen to exist. Tokens are never included in the response.

export type ProviderStatus =
  | "not_connected"
  | "connected"
  | "token_expired"
  | "sync_error";

router.get(
  "/media/connections/status",
  requireUser,
  async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const rows = await db
      .select({
        provider: mediaIntegrations.provider,
        is_active: mediaIntegrations.is_active,
        refresh_token: mediaIntegrations.refresh_token,
        token_expires_at: mediaIntegrations.token_expires_at,
        connected_at: mediaIntegrations.connected_at,
        last_sync_at: mediaIntegrations.last_sync_at,
        last_sync_status: mediaIntegrations.last_sync_status,
        last_sync_error: mediaIntegrations.last_sync_error,
      })
      .from(mediaIntegrations)
      .where(eq(mediaIntegrations.user_id, userId));

    const byProvider = new Map(rows.map((r) => [r.provider, r]));
    const result = ["spotify", "youtube"].map((provider) => {
      const row = byProvider.get(provider);
      if (!row || !row.is_active) {
        return { provider, status: "not_connected" as ProviderStatus };
      }
      const expMs = row.token_expires_at
        ? new Date(row.token_expires_at).getTime()
        : 0;
      let status: ProviderStatus = "connected";
      if (!row.refresh_token && expMs > 0 && expMs < Date.now()) {
        // Access token expired and there is no refresh token to renew it —
        // the user must reconnect.
        status = "token_expired";
      } else if (row.last_sync_status === "error") {
        status = "sync_error";
      }
      return {
        provider,
        status,
        connected_at: row.connected_at,
        last_sync_at: row.last_sync_at,
        last_sync_error:
          status === "sync_error" ? (row.last_sync_error ?? null) : null,
      };
    });
    res.json(result);
  },
);

export default router;
