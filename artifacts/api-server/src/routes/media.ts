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
import { db, mediaIntegrations } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireUser } from "../lib/auth";

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
  const domain = process.env.REPLIT_DEV_DOMAIN ?? "";
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
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          is_active: true,
          scopes: [YT_SCOPE],
          connected_at: new Date(),
          token_expires_at: expiresAt,
        })
        .onConflictDoUpdate({
          target: [mediaIntegrations.user_id, mediaIntegrations.provider],
          set: {
            access_token: tokens.access_token,
            // Google only re-sends the refresh_token with prompt=consent;
            // keep whatever we got (it is always present on first consent).
            ...(tokens.refresh_token
              ? { refresh_token: tokens.refresh_token }
              : {}),
            is_active: true,
            scopes: [YT_SCOPE],
            connected_at: new Date(),
            token_expires_at: expiresAt,
            updated_at: new Date(),
          },
        });

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
  if (expiresAt > Date.now() + 60_000) return row.access_token;

  if (!row.refresh_token) return null;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: row.refresh_token,
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
      access_token: tokens.access_token,
      token_expires_at: new Date(
        Date.now() + (tokens.expires_in ?? 3600) * 1000,
      ),
      last_sync_at: new Date(),
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

export default router;
