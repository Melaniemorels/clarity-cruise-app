// Two-user privacy isolation test for the generic query surface.
//
// Verifies the invariant behind "no screen shows someone else's private data":
// reads on PRIVATE_READ_TABLES (notes, entries, feed_settings, calendar_events,
// ...) issued through POST /db/query are force-scoped to the authenticated
// caller, so an unfiltered select — or even a select that explicitly filters
// for another user's id — never returns another user's rows.
//
// The real server authenticates via Clerk cookies; here the db router is
// mounted behind a test-only middleware that injects req.authUser from the
// x-test-user header, so the exact production route logic (db.ts) is exercised
// against the real dev database with two freshly created users.
//
// Run with: pnpm --filter @workspace/api-server run test

import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import { db, appUsers, vyvTables } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import dbRouter from "../routes/db";
import type { AuthedUser } from "../lib/auth";

const users: Record<string, AuthedUser> = {};

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  const key = req.headers["x-test-user"];
  if (typeof key === "string" && users[key]) req.authUser = users[key];
  next();
});
app.use(dbRouter);

let server: Server;
let baseUrl: string;

async function query(asUser: "a" | "b", body: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}/db/query`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user": asUser },
    body: JSON.stringify(body),
  });
  return (await res.json()) as {
    data: Record<string, unknown>[] | null;
    error: unknown;
    count: number | null;
  };
}

const marker = `privacy-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

before(async () => {
  const [a] = await db
    .insert(appUsers)
    .values({ email: `${marker}-a@test.local` })
    .returning();
  const [b] = await db
    .insert(appUsers)
    .values({ email: `${marker}-b@test.local` })
    .returning();
  users.a = { id: a.id, email: a.email };
  users.b = { id: b.id, email: b.email };

  // Seed private rows for user A on the screens' tables.
  await db.insert(vyvTables.notes).values({
    user_id: a.id,
    title: `SECRETNOTE-${marker}`,
    content: "private note body",
  });
  await db.insert(vyvTables.entries).values({
    user_id: a.id,
    caption: `SECRETENTRY-${marker}`,
    visibility: "private",
    occurred_at: new Date(),
  });
  await db.insert(vyvTables.feed_settings).values({
    user_id: a.id,
    daily_feed_minutes: 123,
  });
  await db.insert(vyvTables.calendar_events).values({
    user_id: a.id,
    title: `SECRETEVENT-${marker}`,
    category: "personal",
    starts_at: new Date(),
    ends_at: new Date(Date.now() + 60 * 60 * 1000),
  });

  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  if (addr === null || typeof addr === "string") throw new Error("no port");
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  server?.close();
  const ids = [users.a?.id, users.b?.id].filter((v): v is string => !!v);
  if (ids.length > 0) {
    await db.delete(vyvTables.notes).where(inArray(vyvTables.notes.user_id, ids));
    await db
      .delete(vyvTables.entries)
      .where(inArray(vyvTables.entries.user_id, ids));
    await db
      .delete(vyvTables.feed_settings)
      .where(inArray(vyvTables.feed_settings.user_id, ids));
    await db
      .delete(vyvTables.calendar_events)
      .where(inArray(vyvTables.calendar_events.user_id, ids));
    for (const id of ids) {
      await db.delete(appUsers).where(eq(appUsers.id, id));
    }
  }
});

const PRIVATE_TABLES = [
  "notes",
  "entries",
  "feed_settings",
  "calendar_events",
] as const;

test("owner sees their own private rows (sanity)", async () => {
  const res = await query("a", { table: "notes", action: "select" });
  assert.equal(res.error, null);
  assert.ok(
    (res.data ?? []).some((r) => r.title === `SECRETNOTE-${marker}`),
    "user A should see their own note",
  );
});

for (const table of PRIVATE_TABLES) {
  test(`unfiltered select on ${table} never returns another user's rows`, async () => {
    const res = await query("b", { table, action: "select" });
    assert.equal(res.error, null);
    const rows = res.data ?? [];
    assert.equal(
      rows.filter((r) => r.user_id === users.a.id).length,
      0,
      `user B must not receive user A's ${table} rows`,
    );
    for (const row of rows) {
      assert.equal(row.user_id, users.b.id, `${table} rows must belong to caller`);
    }
  });

  test(`select on ${table} explicitly filtering for another user's id returns nothing`, async () => {
    const res = await query("b", {
      table,
      action: "select",
      filters: [{ col: "user_id", op: "eq", val: users.a.id }],
    });
    assert.equal(res.error, null);
    assert.equal(
      (res.data ?? []).length,
      0,
      `user B must not be able to target user A's ${table} rows by filter`,
    );
  });
}

test("count-only (head) request on a private table is also owner-scoped", async () => {
  const res = await query("b", {
    table: "feed_settings",
    action: "select",
    head: true,
    count: "exact",
  });
  assert.equal(res.error, null);
  assert.equal(res.count, 0, "user B has no feed_settings rows; A's must not be counted");
});

test("unauthenticated request is rejected", async () => {
  const res = await fetch(`${baseUrl}/db/query`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ table: "notes", action: "select" }),
  });
  assert.equal(res.status, 401);
});
