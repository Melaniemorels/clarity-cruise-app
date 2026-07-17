import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const STATIC_URLS = [
  { loc: "/welcome", priority: "1.0", changefreq: "monthly" },
  { loc: "/sign-in", priority: "0.8", changefreq: "monthly" },
  { loc: "/sign-up", priority: "0.8", changefreq: "monthly" },
  { loc: "/members", priority: "0.7", changefreq: "daily" },
  { loc: "/privacy-policy", priority: "0.5", changefreq: "yearly" },
  { loc: "/terms-of-use", priority: "0.5", changefreq: "yearly" },
];

function getCanonicalOrigin(req: { get(h: string): string | undefined; protocol: string }): string {
  // Prefer an explicit env var set to the production domain (e.g. https://vyvapp.com).
  if (process.env.CANONICAL_ORIGIN) {
    return process.env.CANONICAL_ORIGIN.replace(/\/$/, "");
  }
  // In proxied deployments the reverse proxy sets X-Forwarded-Proto so we use
  // that over req.protocol (which defaults to "http" without trust proxy set).
  const proto = req.get("x-forwarded-proto") ?? req.protocol;
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "localhost";
  // Strip the /api path segment that the proxy prepends when forwarding.
  return `${proto}://${host}`.replace(/\/api$/, "");
}

router.get("/sitemap.xml", async (req, res) => {
  try {
    const origin = getCanonicalOrigin(req);
    const now = new Date().toISOString().slice(0, 10);

    // Only list public, non-suspended profiles so private users are never indexed.
    const profileRows = await db.execute<{ handle: string; updated_at: string | null }>(
      sql`
        SELECT handle, updated_at
        FROM profiles
        WHERE handle IS NOT NULL
          AND is_private = false
          AND is_suspended = false
        ORDER BY created_at DESC
        LIMIT 5000
      `
    );

    const staticEntries = STATIC_URLS.map(
      ({ loc, priority, changefreq }) => `
  <url>
    <loc>${origin}${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <lastmod>${now}</lastmod>
  </url>`
    ).join("");

    const profileEntries = profileRows.rows
      .map((row) => {
        const lastmod = row.updated_at
          ? new Date(row.updated_at).toISOString().slice(0, 10)
          : now;
        return `
  <url>
    <loc>${origin}/u/${encodeURIComponent(row.handle)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
    <lastmod>${lastmod}</lastmod>
  </url>`;
      })
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${profileEntries}
</urlset>`;

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (_err) {
    res.status(500).send("Failed to generate sitemap");
  }
});

export default router;
