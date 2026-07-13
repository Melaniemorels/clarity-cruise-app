// Refresh-button regression test for the Explorer discovery endpoints.
//
// The Explorer's refresh buttons send the ids currently on screen as
// exclude_ids so the backend returns *different* content. This test seeds a
// pool of eligible catalogue items, calls /functions/v1/explore-feed and
// /functions/v1/contextual-recommendations twice (second time excluding the
// first response's ids), and asserts the returned ids never overlap with the
// excluded ones while enough eligible content remains.
//
// The real server authenticates via Clerk cookies; here the functions router
// is mounted behind a test-only middleware that injects req.authUser from the
// x-test-user header, so the exact production route logic (functions.ts) is
// exercised against the real dev database.
//
// Run with: pnpm --filter @workspace/api-server run test

import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import { db, appUsers, vyvTables } from "@workspace/db";
import { desc, eq, like } from "drizzle-orm";
import functionsRouter from "../routes/functions";
import { HEALTHY_CATEGORY_SET } from "../lib/healthy";
import type { AuthedUser } from "../lib/auth";

const users: Record<string, AuthedUser> = {};

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  const key = req.headers["x-test-user"];
  if (typeof key === "string" && users[key]) req.authUser = users[key];
  next();
});
app.use(functionsRouter);

let server: Server;
let baseUrl: string;

async function callFn(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}/functions/v1/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user": "u" },
    body: JSON.stringify(body),
  });
  assert.equal(res.status, 200, `${path} should respond 200`);
  return (await res.json()) as Record<string, unknown>;
}

const marker = `refresh-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Spread the seeded pool across several healthy categories with distinct
// creators (both endpoints dedupe by creator, and contextual-recommendations
// caps 2 items per category).
const SEED_CATEGORIES = [
  "Yoga",
  "Pilates",
  "Ejercicios",
  "Meditación",
  "Calma",
  "Nutrición",
] as const;
// 8 per category keeps every per-category pool at or above pageSize(4) + 4
// fresh alternatives, so the refresh guard is always honorable even when the
// live catalogue's newest-200 window contains few items of that category.
const PER_CATEGORY = 8; // 48 items total — plenty of eligible content

// Exhaustion-guard pool: a tiny, fully controlled eligible catalogue in a
// test-exclusive language ("zz"). With language "zz" requested, the only
// eligible items are these (plus any null-language items, which we also
// account for by mirroring the routes' pool query at test time). Excluding
// the whole pool exercises the "never go blank" guard.
const EXHAUST_LANGUAGE = "zz";
const EXHAUST_POOL_SIZE = 5;

before(async () => {
  const [u] = await db
    .insert(appUsers)
    .values({ email: `${marker}@test.local` })
    .returning();
  users.u = { id: u.id, email: u.email };

  const values = SEED_CATEGORIES.flatMap((category, ci) =>
    Array.from({ length: PER_CATEGORY }, (_, i) => ({
      title: `${category} session ${i} ${marker}`,
      description: "seeded refresh-test item",
      source: "web",
      url: `https://example.test/${marker}/${ci}-${i}`,
      duration_min: 10,
      category,
      tags: ["bienestar"],
      language: "es",
      creator: `creator-${marker}-${ci}-${i}`,
      is_verified: true,
    })),
  );
  await db.insert(vyvTables.explore_items).values(values);

  const exhaustValues = Array.from({ length: EXHAUST_POOL_SIZE }, (_, i) => ({
    title: `Yoga exhaust ${i} ${marker}`,
    description: "seeded exhaustion-guard item",
    source: "web",
    url: `https://example.test/${marker}/exhaust-${i}`,
    duration_min: 10,
    category: "Yoga",
    tags: ["bienestar"],
    language: EXHAUST_LANGUAGE,
    creator: `creator-${marker}-exhaust-${i}`,
    is_verified: true,
  }));
  await db.insert(vyvTables.explore_items).values(exhaustValues);

  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  if (addr === null || typeof addr === "string") throw new Error("no port");
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  server?.close();
  await db
    .delete(vyvTables.explore_items)
    .where(like(vyvTables.explore_items.url, `https://example.test/${marker}/%`));
  if (users.u) {
    await db.delete(appUsers).where(eq(appUsers.id, users.u.id));
  }
});

// ---------------------------------------------------------------------------
// explore-feed
// ---------------------------------------------------------------------------

function feedIds(body: Record<string, unknown>): string[] {
  const items = body.items as { id: string }[] | undefined;
  assert.ok(Array.isArray(items), "explore-feed must return items[]");
  return items.map((i) => i.id);
}

test("explore-feed: refresh with exclude_ids returns non-overlapping items", async () => {
  const first = await callFn("explore-feed", {
    mode: "for_you",
    language: "es",
    pageSize: 8,
  });
  const firstIds = feedIds(first);
  assert.ok(firstIds.length > 0, "first page must have items");

  const second = await callFn("explore-feed", {
    mode: "for_you",
    language: "es",
    pageSize: 8,
    exclude_ids: firstIds,
  });
  const secondIds = feedIds(second);
  assert.ok(secondIds.length > 0, "refresh must still return items");

  const excluded = new Set(firstIds);
  const overlap = secondIds.filter((id) => excluded.has(id));
  assert.deepEqual(
    overlap,
    [],
    "refreshed feed must not repeat any of the excluded (visible) ids",
  );
});

test("explore-feed: category refresh with exclude_ids returns non-overlapping items", async () => {
  const category = "Yoga";
  const first = await callFn("explore-feed", {
    mode: "see_all",
    language: "es",
    category,
    pageSize: 4,
  });
  const firstIds = feedIds(first);
  assert.ok(firstIds.length > 0, "first category page must have items");

  const second = await callFn("explore-feed", {
    mode: "see_all",
    language: "es",
    category,
    pageSize: 4,
    exclude_ids: firstIds,
  });
  const secondIds = feedIds(second);
  assert.ok(secondIds.length > 0, "category refresh must still return items");

  const excluded = new Set(firstIds);
  assert.deepEqual(
    secondIds.filter((id) => excluded.has(id)),
    [],
    "refreshed category section must not repeat excluded ids",
  );
});

test("explore-feed: malformed exclude_ids is ignored, not an error", async () => {
  const body = await callFn("explore-feed", {
    mode: "for_you",
    language: "es",
    pageSize: 4,
    exclude_ids: "not-an-array",
  });
  assert.ok(feedIds(body).length > 0, "feed must still return items");
});

// ---------------------------------------------------------------------------
// contextual-recommendations
// ---------------------------------------------------------------------------

function recIds(body: Record<string, unknown>): string[] {
  const recs = body.recommendations as
    | { home?: { item_id: string }[]; explorer?: { item_id: string }[] }
    | undefined;
  assert.ok(recs, "contextual-recommendations must return recommendations");
  return [...(recs.home ?? []), ...(recs.explorer ?? [])].map(
    (r) => r.item_id,
  );
}

test("contextual-recommendations: refresh with exclude_ids returns non-overlapping items", async () => {
  const first = await callFn("contextual-recommendations", {
    language: "es",
    target: "both",
  });
  const firstIds = recIds(first);
  assert.ok(firstIds.length > 0, "first call must return recommendations");

  const second = await callFn("contextual-recommendations", {
    language: "es",
    target: "both",
    exclude_ids: firstIds,
  });
  const secondIds = recIds(second);
  assert.ok(secondIds.length > 0, "refresh must still return recommendations");

  const excluded = new Set(firstIds);
  assert.deepEqual(
    secondIds.filter((id) => excluded.has(id)),
    [],
    "refreshed recommendations must not repeat excluded ids",
  );
});

test("contextual-recommendations: explorer-only refresh excludes visible ids", async () => {
  const first = await callFn("contextual-recommendations", {
    language: "es",
    target: "explorer",
  });
  const firstIds = recIds(first);
  assert.ok(firstIds.length > 0, "explorer target must return recommendations");

  const second = await callFn("contextual-recommendations", {
    language: "es",
    target: "explorer",
    exclude_ids: firstIds,
  });
  const secondIds = recIds(second);
  assert.ok(secondIds.length > 0, "refresh must still return recommendations");

  const excluded = new Set(firstIds);
  assert.deepEqual(
    secondIds.filter((id) => excluded.has(id)),
    [],
    "refreshed explorer recommendations must not repeat excluded ids",
  );
});

// ---------------------------------------------------------------------------
// Exhaustion guard: when the user has refreshed so often that exclude_ids
// covers (nearly) the whole eligible pool, both endpoints must ignore the
// exclusion rather than go blank. The eligible pool is made tiny and fully
// controlled via the test-exclusive language, and computed by mirroring the
// routes' own pool query (newest N, healthy category, language match or
// unknown) so the exclusion provably covers everything eligible.
// ---------------------------------------------------------------------------

async function eligibleExhaustIds(
  windowSize: number,
  category?: string,
): Promise<string[]> {
  const rows = await db
    .select({
      id: vyvTables.explore_items.id,
      category: vyvTables.explore_items.category,
      language: vyvTables.explore_items.language,
    })
    .from(vyvTables.explore_items)
    .orderBy(desc(vyvTables.explore_items.created_at))
    .limit(windowSize);
  return rows
    .filter(
      (r) =>
        (!r.language || r.language === EXHAUST_LANGUAGE) &&
        HEALTHY_CATEGORY_SET.has(r.category) &&
        (!category || r.category === category),
    )
    .map((r) => r.id);
}

function assertCoverableExclusion(excludeIds: string[]) {
  assert.ok(
    excludeIds.length >= EXHAUST_POOL_SIZE,
    "eligible pool must include the seeded exhaustion items",
  );
  assert.ok(
    excludeIds.length <= 100,
    "eligible pool must fit within the exclude_ids cap (100) for the guard to be provably exercised",
  );
}

// Other test files may concurrently seed/clean null-language items (which
// pass every language filter), so the "returned ids came from the eligible
// pool" check compares against the union of a pre-call and post-call
// snapshot of the eligible pool to stay race-free.
test("explore-feed: excluding the entire eligible pool still returns items", async () => {
  // explore-feed reads the newest 200 catalogue items.
  const excludeIds = await eligibleExhaustIds(200);
  assertCoverableExclusion(excludeIds);

  const body = await callFn("explore-feed", {
    mode: "for_you",
    language: EXHAUST_LANGUAGE,
    pageSize: 8,
    exclude_ids: excludeIds,
  });
  const ids = feedIds(body);
  assert.ok(
    ids.length > 0,
    "feed must never go blank when exclude_ids covers the whole eligible pool",
  );
  const eligible = new Set([...excludeIds, ...(await eligibleExhaustIds(200))]);
  for (const id of ids) {
    assert.ok(
      eligible.has(id),
      "returned items must come from the eligible (excluded) pool, proving the guard ignored the exclusion",
    );
  }
});

test("explore-feed: category section with the entire pool excluded still returns items", async () => {
  const excludeIds = await eligibleExhaustIds(200, "Yoga");
  assertCoverableExclusion(excludeIds);

  const body = await callFn("explore-feed", {
    mode: "see_all",
    language: EXHAUST_LANGUAGE,
    category: "Yoga",
    pageSize: 4,
    exclude_ids: excludeIds,
  });
  const ids = feedIds(body);
  assert.ok(
    ids.length > 0,
    "category section must never go blank when exclude_ids covers the whole eligible pool",
  );
  const eligible = new Set([
    ...excludeIds,
    ...(await eligibleExhaustIds(200, "Yoga")),
  ]);
  for (const id of ids) {
    assert.ok(
      eligible.has(id),
      "returned category items must come from the eligible (excluded) pool",
    );
  }
});

test("contextual-recommendations: excluding the entire eligible pool still returns recommendations", async () => {
  // contextual-recommendations reads the newest 300 catalogue items.
  const excludeIds = await eligibleExhaustIds(300);
  assertCoverableExclusion(excludeIds);

  const body = await callFn("contextual-recommendations", {
    language: EXHAUST_LANGUAGE,
    target: "both",
    exclude_ids: excludeIds,
  });
  const ids = recIds(body);
  assert.ok(
    ids.length > 0,
    "recommendations must never go blank when exclude_ids covers the whole eligible pool",
  );
  const eligible = new Set([...excludeIds, ...(await eligibleExhaustIds(300))]);
  for (const id of ids) {
    assert.ok(
      eligible.has(id),
      "returned recommendations must come from the eligible (excluded) pool, proving the guard ignored the exclusion",
    );
  }
});
