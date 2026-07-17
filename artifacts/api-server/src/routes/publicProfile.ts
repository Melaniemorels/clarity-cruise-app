import { Router, type IRouter, type Request, type Response } from "express";
import { db, vyvTables } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router: IRouter = Router();

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function countRows(table: any, condition: any): Promise<number> {
  try {
    const result = await db
      .select({ n: sql<number>`count(*)` })
      .from(table)
      .where(condition);
    return Number(result[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

router.get("/u/:username", async (req: Request, res: Response) => {
  const { username } = req.params;

  if (!username || !/^[a-zA-Z0-9_.-]{1,64}$/.test(username)) {
    res.status(400).send("Invalid username");
    return;
  }

  try {
    const profileRows = await db
      .select({
        user_id: vyvTables.profiles.user_id,
        handle: vyvTables.profiles.handle,
        name: vyvTables.profiles.name,
        bio: vyvTables.profiles.bio,
        photo_url: vyvTables.profiles.photo_url,
        is_private: vyvTables.profiles.is_private,
      })
      .from(vyvTables.profiles)
      .where(eq(vyvTables.profiles.handle, username))
      .limit(1);

    const profile = profileRows[0];

    if (!profile) {
      res.status(404).send(buildNotFoundHtml(username));
      return;
    }

    const [followers_count, following_count, posts_count] = await Promise.all([
      countRows(
        vyvTables.follows,
        and(
          eq(vyvTables.follows.following_id, profile.user_id),
          eq(vyvTables.follows.status, "accepted"),
        ),
      ),
      countRows(
        vyvTables.follows,
        and(
          eq(vyvTables.follows.follower_id, profile.user_id),
          eq(vyvTables.follows.status, "accepted"),
        ),
      ),
      countRows(vyvTables.posts, eq(vyvTables.posts.user_id, profile.user_id)),
    ]);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.send(
      buildProfileHtml({
        handle: profile.handle,
        name: profile.name,
        bio: profile.bio,
        photo_url: profile.photo_url,
        is_private: profile.is_private ?? false,
        followers_count,
        following_count,
        posts_count,
      }),
    );
  } catch (_err) {
    res.status(500).send("Internal server error");
  }
});

function buildProfileHtml(p: {
  handle: string;
  name: string | null;
  bio: string | null;
  photo_url: string | null;
  is_private: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
}): string {
  const displayName = p.name ? esc(p.name) : `@${esc(p.handle)}`;
  const handle = esc(p.handle);
  const bio = esc(p.bio);
  const photo = esc(p.photo_url);
  const pageTitle = p.name
    ? `${esc(p.name)} (@${handle}) — VYV`
    : `@${handle} — VYV`;
  const description = p.is_private
    ? `${displayName} has a private profile on VYV.`
    : [
        bio || null,
        `${p.followers_count} followers · ${p.following_count} following · ${p.posts_count} posts on VYV.`,
      ]
        .filter(Boolean)
        .join(" ");

  const ldJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    name: p.name ?? p.handle,
    alternateName: `@${p.handle}`,
    ...(p.photo_url ? { image: p.photo_url } : {}),
    ...(p.bio && !p.is_private ? { description: p.bio } : {}),
  });

  const avatarSection = photo
    ? `<img src="${photo}" alt="${displayName}" class="avatar" />`
    : `<div class="avatar-placeholder">${esc(p.handle.charAt(0).toUpperCase())}</div>`;

  const statsSection = p.is_private
    ? `<div class="private-notice">🔒 This profile is private</div>`
    : `${bio ? `<p class="bio">${bio}</p>` : ""}
      <div class="stats">
        <div class="stat"><strong>${p.posts_count}</strong><span>Posts</span></div>
        <div class="stat"><strong>${p.followers_count}</strong><span>Followers</span></div>
        <div class="stat"><strong>${p.following_count}</strong><span>Following</span></div>
      </div>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${pageTitle}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="icon" href="/favicon.png" type="image/png" />

    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${pageTitle}" />
    <meta property="og:description" content="${esc(description)}" />
    ${photo ? `<meta property="og:image" content="${photo}" />` : ""}
    <meta property="og:url" content="https://vyvapp.com/u/${handle}" />

    <meta name="twitter:card" content="${photo ? "summary_large_image" : "summary"}" />
    <meta name="twitter:title" content="${pageTitle}" />
    <meta name="twitter:description" content="${esc(description)}" />
    ${photo ? `<meta name="twitter:image" content="${photo}" />` : ""}

    <link rel="canonical" href="https://vyvapp.com/u/${handle}" />
    <script type="application/ld+json">${ldJson}</script>

    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#0d1117;color:#e8ebed;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
      .card{background:#12171e;border:1px solid #1e2630;border-radius:16px;padding:32px 24px;max-width:380px;width:100%;text-align:center}
      .avatar{width:96px;height:96px;border-radius:50%;object-fit:cover;border:2px solid #2a323c;margin-bottom:16px}
      .avatar-placeholder{width:96px;height:96px;border-radius:50%;background:#4A8B7C;color:#fff;font-size:2rem;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
      .handle{font-size:1.25rem;font-weight:700;color:#e8ebed}
      .name{font-size:0.9rem;color:#9aa4ae;margin-top:4px}
      .bio{font-size:0.9rem;color:#9aa4ae;line-height:1.6;margin:16px 0}
      .stats{display:flex;justify-content:center;gap:24px;margin:16px 0}
      .stat{display:flex;flex-direction:column;gap:2px;align-items:center}
      .stat strong{font-size:1.1rem;color:#e8ebed}
      .stat span{font-size:0.75rem;color:#9aa4ae}
      .private-notice{color:#9aa4ae;font-size:0.9rem;padding:16px 0}
      .cta{display:block;width:100%;padding:12px 24px;background:#4A8B7C;color:#fff;font-size:0.95rem;font-weight:600;text-decoration:none;border-radius:10px;margin-top:20px}
      .cta:hover{opacity:.9}
      .brand{font-size:0.75rem;color:#9aa4ae;margin-top:24px}
      .brand a{color:#4A8B7C;text-decoration:none}
    </style>
  </head>
  <body>
    <div class="card">
      ${avatarSection}
      <div class="handle">@${handle}</div>
      ${p.name ? `<div class="name">${displayName}</div>` : ""}
      ${statsSection}
      <a class="cta" href="/sign-up">Join VYV to connect</a>
      <p class="brand"><a href="/">VYV — Visualize Your Vibe</a></p>
    </div>
  </body>
</html>`;
}

function buildNotFoundHtml(username: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>@${esc(username)} not found — VYV</title>
    <meta name="robots" content="noindex" />
    <link rel="icon" href="/favicon.png" type="image/png" />
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0d1117;color:#e8ebed;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center}
      h1{margin-bottom:12px}
      a{color:#4A8B7C;text-decoration:none}
    </style>
  </head>
  <body>
    <div>
      <h1>Profile not found</h1>
      <p>@${esc(username)} doesn't exist on VYV.</p>
      <p style="margin-top:24px"><a href="/">Back to VYV</a></p>
    </div>
  </body>
</html>`;
}

export default router;
