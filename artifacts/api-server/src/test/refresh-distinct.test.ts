// Refresh-returns-different-content test for the Explorer feed endpoints.
//
// Verifies the invariant behind the refresh buttons ("show me something
// different"): when the client sends the ids it is currently showing as
// exclude_ids, neither /functions/v1/explore-feed nor
// /functions/v1/contextual-recommendations returns any of those ids again
// (as long as enough other eligible content exists — guaranteed here by
// seeding a large batch of catalogue items).
//
// The real server authenticates via Clerk cookies; here the functions router
// is mounted behind a test-only middleware that injects req.authUser from the
// x-test-user header, so the exact production route logic is exercised
// against the real dev database.
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

async function call(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user": "u" },
    body: JSON.stringify(body),
  });
  assert.equal(res.status, 200, `${path} should respond 200`);
  return (await res.json()) as Record<string, any>;
}

const marker = `refresh-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const SEED_COUNT = 30;

before(async () => {
  const [u] = await db
    .insert(appUsers)
    .values({ email: `${marker}@test.local` })
    .returning();
  users.u = { id: u.id, email: u.email };

  // Seed a healthy batch of catalogue items in one section so exclusion can
  // always be honored (backend only honors exclude_ids when >= 4 alternatives
  // remain). language: null passes every language filter.
  await db.insert(vyvTables.explore_items).values(
    Array.from({ length: SEED_COUNT }, (_, i) => ({
      title: `Yoga session ${i} (${marker})`,
      url: `https://example.test/${marker}/${i}`,
      category: "Yoga",
      source: "web",
      duration_min: 15,
      creator: `creator-${marker}-${i}`,
      language: null,
    })),
  );

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

test("explore-feed refresh with exclude_ids returns no previously shown items", async () => {
  const first = await call("/functions/v1/explore-feed", {
    mode: "for_you",
    category: "Yoga",
    language: "es",
    pageSize: 8,
  });
  const firstIds: string[] = (first.items ?? []).map((i: any) => i.id);
  assert.ok(firstIds.length > 0, "first page should return items");

  const second = await call("/functions/v1/explore-feed", {
    mode: "for_you",
    category: "Yoga",
    language: "es",
    pageSize: 8,
    exclude_ids: firstIds,
  });
  const secondIds: string[] = (second.items ?? []).map((i: any) => i.id);
  assert.ok(secondIds.length > 0, "refresh should still return items");

  const excluded = new Set(firstIds);
  const overlap = secondIds.filter((id) => excluded.has(id));
  assert.deepEqual(
    overlap,
    [],
    "refresh must not repeat any of the excluded (currently shown) items",
  );
});

test("explore-feed keeps strict category purity on refresh", async () => {
  const first = await call("/functions/v1/explore-feed", {
    mode: "for_you",
    category: "Yoga",
    language: "es",
    pageSize: 8,
  });
  const firstItems: any[] = first.items ?? [];
  assert.ok(firstItems.length > 0, "first page should return items");
  for (const item of firstItems) {
    assert.equal(item.category, "Yoga", "first page must stay in-category");
  }

  // True refresh: exclude what is currently shown, then re-check purity.
  const second = await call("/functions/v1/explore-feed", {
    mode: "for_you",
    category: "Yoga",
    language: "es",
    pageSize: 8,
    exclude_ids: firstItems.map((i) => i.id),
  });
  const secondItems: any[] = second.items ?? [];
  assert.ok(secondItems.length > 0, "refresh should still return items");
  for (const item of secondItems) {
    assert.equal(
      item.category,
      "Yoga",
      "a refreshed section feed must only contain items of its own category",
    );
  }
});

test("contextual-recommendations refresh with exclude_ids returns different items", async () => {
  const first = await call("/functions/v1/contextual-recommendations", {
    target: "explorer",
    language: "es",
  });
  const firstIds: string[] = (first.recommendations?.explorer ?? [])
    .map((r: any) => r.item_id)
    .filter((id: unknown): id is string => typeof id === "string");
  assert.ok(firstIds.length > 0, "first call should return recommendations");

  const second = await call("/functions/v1/contextual-recommendations", {
    target: "explorer",
    language: "es",
    exclude_ids: firstIds,
  });
  const secondIds: string[] = (second.recommendations?.explorer ?? [])
    .map((r: any) => r.item_id)
    .filter((id: unknown): id is string => typeof id === "string");
  assert.ok(secondIds.length > 0, "refresh should still return recommendations");

  const excluded = new Set(firstIds);
  const overlap = secondIds.filter((id) => excluded.has(id));
  assert.deepEqual(
    overlap,
    [],
    "contextual refresh must not repeat any excluded item",
  );
});
