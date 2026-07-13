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
import { eq, like } from "drizzle-orm";
import functionsRouter from "../routes/functions";
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
const PER_CATEGORY = 6; // 36 items total — plenty of eligible content

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
