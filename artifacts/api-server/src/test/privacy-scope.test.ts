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
  await db.insert(vyvTables.explorer_saved_items).values({
    user_id: a.id,
    provider: "vyv",
    provider_item_id: `saved-${marker}`,
    title: `SECRETSAVED-${marker}`,
  });
  await db.insert(vyvTables.explorer_progress).values({
    user_id: a.id,
    provider: "vyv",
    provider_item_id: `progress-${marker}`,
    title: `SECRETPROGRESS-${marker}`,
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
    await db
      .delete(vyvTables.follows)
      .where(inArray(vyvTables.follows.follower_id, ids));
    await db
      .delete(vyvTables.follows)
      .where(inArray(vyvTables.follows.following_id, ids));
    await db
      .delete(vyvTables.social_plan_invites)
      .where(inArray(vyvTables.social_plan_invites.invitee_id, ids));
    await db
      .delete(vyvTables.social_plans)
      .where(inArray(vyvTables.social_plans.creator_id, ids));
    await db
      .delete(vyvTables.media_integrations)
      .where(inArray(vyvTables.media_integrations.user_id, ids));
    await db
      .delete(vyvTables.explorer_saved_items)
      .where(inArray(vyvTables.explorer_saved_items.user_id, ids));
    await db
      .delete(vyvTables.explorer_progress)
      .where(inArray(vyvTables.explorer_progress.user_id, ids));
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
  "explorer_saved_items",
  "explorer_progress",
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

// ---------------------------------------------------------------------------
// Mutation authorization: tables without a plain user_id column.
// ---------------------------------------------------------------------------

test("follows: insert cannot spoof follower_id (forced to caller)", async () => {
  const res = await query("b", {
    table: "follows",
    action: "insert",
    values: { follower_id: users.a.id, following_id: users.a.id },
  });
  assert.equal(res.error, null);
  const row = (res.data ?? [])[0];
  assert.ok(row, "insert should return the row");
  assert.equal(row.follower_id, users.b.id, "follower_id must be the caller");
});

test("follows: a third party cannot delete someone else's follow edge", async () => {
  // A follows B (seeded directly).
  const [edge] = await db
    .insert(vyvTables.follows)
    .values({ follower_id: users.a.id, following_id: users.b.id })
    .returning();
  // B deletes it as the target — allowed (remove-follower flow).
  const asTarget = await query("b", {
    table: "follows",
    action: "delete",
    filters: [{ col: "id", op: "eq", val: edge.id }],
  });
  assert.equal(asTarget.error, null);
  assert.equal((asTarget.data ?? []).length, 1, "target may remove a follower");

  // Re-seed: A follows a synthetic third id; B is neither side.
  const [edge2] = await db
    .insert(vyvTables.follows)
    .values({ follower_id: users.a.id, following_id: users.a.id })
    .returning();
  const asStranger = await query("b", {
    table: "follows",
    action: "delete",
    filters: [{ col: "id", op: "eq", val: edge2.id }],
  });
  assert.equal(
    (asStranger.data ?? []).length,
    0,
    "user B must not delete a follow edge they are not part of",
  );
  const still = await db
    .select()
    .from(vyvTables.follows)
    .where(eq(vyvTables.follows.id, edge2.id));
  assert.equal(still.length, 1, "edge must survive the foreign delete");
});

test("social_plans: creator forced on insert; strangers cannot update/delete", async () => {
  const created = await query("a", {
    table: "social_plans",
    action: "insert",
    values: {
      creator_id: users.b.id, // spoof attempt
      title: `PLAN-${marker}`,
      plan_date: "2026-07-11",
      start_minute: 600,
      end_minute: 660,
    },
  });
  assert.equal(created.error, null);
  const plan = (created.data ?? [])[0];
  assert.equal(plan.creator_id, users.a.id, "creator_id must be the caller");

  const foreignUpdate = await query("b", {
    table: "social_plans",
    action: "update",
    values: { title: "HIJACKED" },
    filters: [{ col: "id", op: "eq", val: plan.id }],
  });
  assert.equal((foreignUpdate.data ?? []).length, 0, "B must not update A's plan");

  const foreignDelete = await query("b", {
    table: "social_plans",
    action: "delete",
    filters: [{ col: "id", op: "eq", val: plan.id }],
  });
  assert.equal((foreignDelete.data ?? []).length, 0, "B must not delete A's plan");

  const [still] = await db
    .select()
    .from(vyvTables.social_plans)
    .where(eq(vyvTables.social_plans.id, plan.id as string));
  assert.equal(still.title, `PLAN-${marker}`, "plan must be unchanged");
});

test("social_plan_invites: only the plan's creator can invite; invitee can respond", async () => {
  const [plan] = await db
    .insert(vyvTables.social_plans)
    .values({
      creator_id: users.a.id,
      title: `PLAN2-${marker}`,
      plan_date: "2026-07-12",
      start_minute: 600,
      end_minute: 660,
    })
    .returning();

  // B (not the creator) tries to invite themselves.
  const foreignInvite = await query("b", {
    table: "social_plan_invites",
    action: "insert",
    values: { plan_id: plan.id, invitee_id: users.b.id },
  });
  assert.ok(foreignInvite.error, "non-creator insert must be rejected");

  // A (creator) invites B.
  const invite = await query("a", {
    table: "social_plan_invites",
    action: "insert",
    values: { plan_id: plan.id, invitee_id: users.b.id },
  });
  assert.equal(invite.error, null);
  const inviteRow = (invite.data ?? [])[0];

  // B (invitee) accepts.
  const respond = await query("b", {
    table: "social_plan_invites",
    action: "update",
    values: { status: "accepted" },
    filters: [{ col: "id", op: "eq", val: inviteRow.id }],
  });
  assert.equal((respond.data ?? []).length, 1, "invitee may respond");

  // A (not the invitee) cannot flip the response.
  const creatorFlip = await query("a", {
    table: "social_plan_invites",
    action: "update",
    values: { status: "declined" },
    filters: [{ col: "id", op: "eq", val: inviteRow.id }],
  });
  assert.equal(
    (creatorFlip.data ?? []).length,
    0,
    "only the invitee may change their response",
  );
});

test("media_integrations: another user's row cannot be updated or deleted", async () => {
  const [row] = await db
    .insert(vyvTables.media_integrations)
    .values({
      user_id: users.a.id,
      provider: "spotify",
      is_active: true,
      access_token: "sekret",
    })
    .returning();

  const foreignUpdate = await query("b", {
    table: "media_integrations",
    action: "update",
    values: { is_active: false },
    filters: [{ col: "id", op: "eq", val: row.id }],
  });
  assert.equal((foreignUpdate.data ?? []).length, 0, "B must not touch A's integration");

  const foreignDelete = await query("b", {
    table: "media_integrations",
    action: "delete",
    filters: [{ col: "id", op: "eq", val: row.id }],
  });
  assert.equal((foreignDelete.data ?? []).length, 0, "B must not delete A's integration");

  const [still] = await db
    .select()
    .from(vyvTables.media_integrations)
    .where(eq(vyvTables.media_integrations.id, row.id));
  assert.equal(still?.is_active, true, "integration must be unchanged");
});

test("update cannot reassign a row to another user (owner columns stripped)", async () => {
  const inserted = await query("a", {
    table: "notes",
    action: "insert",
    values: { title: `OWNNOTE-${marker}`, content: "x" },
  });
  const note = (inserted.data ?? [])[0];
  const res = await query("a", {
    table: "notes",
    action: "update",
    values: { user_id: users.b.id, title: `OWNNOTE2-${marker}` },
    filters: [{ col: "id", op: "eq", val: note.id }],
  });
  assert.equal(res.error, null);
  const updated = (res.data ?? [])[0];
  assert.equal(updated.user_id, users.a.id, "user_id must not be reassignable");
  assert.equal(updated.title, `OWNNOTE2-${marker}`);
});

test("explorer_saved_items: insert cannot spoof user_id; upsert stays owner-scoped", async () => {
  // B inserts, attempting to spoof A as owner — forced to caller.
  const res = await query("b", {
    table: "explorer_saved_items",
    action: "insert",
    values: {
      user_id: users.a.id,
      provider: "vyv",
      provider_item_id: `spoof-${marker}`,
      title: "spoofed save",
    },
  });
  assert.equal(res.error, null);
  const row = (res.data ?? [])[0];
  assert.equal(row.user_id, users.b.id, "saved item owner must be the caller");

  // B cannot delete A's saved row by filtering for it.
  const foreignDelete = await query("b", {
    table: "explorer_saved_items",
    action: "delete",
    filters: [{ col: "provider_item_id", op: "eq", val: `saved-${marker}` }],
  });
  assert.equal(
    (foreignDelete.data ?? []).length,
    0,
    "B must not delete A's saved item",
  );
  const still = await db
    .select()
    .from(vyvTables.explorer_saved_items)
    .where(eq(vyvTables.explorer_saved_items.user_id, users.a.id));
  assert.ok(
    still.some((r) => r.provider_item_id === `saved-${marker}`),
    "A's saved item must survive",
  );
});

test("explorer_progress: upsert is owner-scoped and cannot touch another user's row", async () => {
  // B upserts progress on the same provider_item_id A already has — must
  // create B's own row, not update A's.
  const res = await query("b", {
    table: "explorer_progress",
    action: "upsert",
    values: {
      provider: "vyv",
      provider_item_id: `progress-${marker}`,
      title: "b's own progress",
    },
    onConflict: "user_id,provider,provider_item_id",
  });
  assert.equal(res.error, null);
  const row = (res.data ?? [])[0];
  assert.equal(row.user_id, users.b.id, "progress row must belong to caller");

  const aRows = await db
    .select()
    .from(vyvTables.explorer_progress)
    .where(eq(vyvTables.explorer_progress.user_id, users.a.id));
  const aRow = aRows.find((r) => r.provider_item_id === `progress-${marker}`);
  assert.equal(
    aRow?.title,
    `SECRETPROGRESS-${marker}`,
    "A's progress row must be untouched",
  );
});

test("global reference tables are read-only for clients", async () => {
  for (const table of ["explore_items", "categories", "activity_types"]) {
    const res = await query("a", {
      table,
      action: "insert",
      values: { name: "nope" },
    });
    assert.ok(res.error, `insert into ${table} must be rejected`);
  }
});
