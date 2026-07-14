// Functional smoke test for the Phase-1 social/calendar flows the app relies on:
//
// 1. Notifications — the cross-user insert pattern the frontend hooks use
//    (follower A inserts a notification for recipient B), recipient-scoped
//    reads/unread counts, and mark-as-read by the recipient.
// 2. Friend availability — mutual friends' busy intervals via
//    /functions/v1/friend-availability, including the privacy opt-out
//    (calendar_visibility = "private") and the mutual-follow requirement.
// 3. AI calendar actions — /functions/v1/vyv-calendar-action create/update/
//    delete, ownership scoping, and the ai_calendar_audit trail.
//
// The real server authenticates via Clerk cookies; here the routers are
// mounted behind a test-only middleware that injects req.authUser from the
// x-test-user header, so the exact production route logic is exercised
// against the real dev database.
//
// Run with: pnpm --filter @workspace/api-server run test

import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import { db, appUsers, vyvTables } from "@workspace/db";
import { eq, inArray, like, or } from "drizzle-orm";
import dbRouter from "../routes/db";
import functionsRouter from "../routes/functions";
import pushRouter from "../routes/push";
import { pushSubscriptions, calendarRemindersSent } from "@workspace/db";
import { runReminderSweep } from "../lib/webPush";
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
app.use(functionsRouter);
app.use(pushRouter);

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

async function callFn(
  asUser: "a" | "b",
  path: string,
  body: Record<string, unknown>,
) {
  const res = await fetch(`${baseUrl}/functions/v1/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user": asUser },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

const marker = `p1flows-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

before(async () => {
  const [a] = await db
    .insert(appUsers)
    .values({ email: `${marker}-a@test.local` })
    .returning();
  const [b] = await db
    .insert(appUsers)
    .values({ email: `${marker}-b@test.local` })
    .returning();
  const [c] = await db
    .insert(appUsers)
    .values({ email: `${marker}-c@test.local` })
    .returning();
  users.a = { id: a.id, email: a.email };
  users.b = { id: b.id, email: b.email };
  users.c = { id: c.id, email: c.email };

  await db.insert(vyvTables.profiles).values([
    { user_id: a.id, handle: `${marker}-a`, name: "Test A" },
    { user_id: b.id, handle: `${marker}-b`, name: "Test B" },
    { user_id: c.id, handle: `${marker}-c`, name: "Test C" },
  ]);

  server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", () => r()));
  const addr = server.address();
  if (typeof addr === "object" && addr) baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  const ids = [users.a.id, users.b.id, users.c.id];
  await db
    .delete(vyvTables.notifications)
    .where(
      or(
        inArray(vyvTables.notifications.user_id, ids),
        inArray(vyvTables.notifications.actor_id, ids),
      ),
    );
  await db
    .delete(vyvTables.follows)
    .where(
      or(
        inArray(vyvTables.follows.follower_id, ids),
        inArray(vyvTables.follows.following_id, ids),
      ),
    );
  await db
    .delete(vyvTables.calendar_events)
    .where(inArray(vyvTables.calendar_events.user_id, ids));
  await db
    .delete(vyvTables.ai_calendar_audit)
    .where(inArray(vyvTables.ai_calendar_audit.user_id, ids));
  await db
    .delete(vyvTables.profile_section_visibility)
    .where(inArray(vyvTables.profile_section_visibility.user_id, ids));
  await db
    .delete(pushSubscriptions)
    .where(inArray(pushSubscriptions.user_id, ids));
  await db
    .delete(calendarRemindersSent)
    .where(inArray(calendarRemindersSent.user_id, ids));
  await db
    .delete(vyvTables.profiles)
    .where(like(vyvTables.profiles.handle, `${marker}%`));
  await db.delete(appUsers).where(inArray(appUsers.id, ids));
  server.close();
});

// ---------------------------------------------------------------------------
// 1. Notifications
// ---------------------------------------------------------------------------

test("notifications: A can notify B; actor is forced to A", async () => {
  // The notification must be backed by a real relationship: A follows B.
  await db
    .insert(vyvTables.follows)
    .values({
      follower_id: users.a.id,
      following_id: users.b.id,
      status: "accepted",
    })
    .onConflictDoNothing();
  const insert = await query("a", {
    table: "notifications",
    action: "insert",
    values: {
      user_id: users.b.id,
      actor_id: "00000000-0000-0000-0000-000000000000", // spoof attempt
      type: "new_follower",
      message: `${marker} started following you`,
    },
    returning: true,
  });
  assert.equal(insert.error, null);
  const row = insert.data?.[0];
  assert.ok(row, "insert should return the notification");
  assert.equal(row!.user_id, users.b.id, "recipient preserved");
  assert.equal(row!.actor_id, users.a.id, "actor forced to authenticated caller");
});

test("notifications: B sees it in their list and unread count; A does not", async () => {
  const listB = await query("b", {
    table: "notifications",
    action: "select",
        filters: [{ col: "user_id", op: "eq", val: users.b.id }],
  });
  assert.equal(listB.error, null);
  assert.ok(
    (listB.data ?? []).some((n) => String(n.message).includes(marker)),
    "B should see the notification",
  );

  const countB = await query("b", {
    table: "notifications",
    action: "select",
        head: true,
    count: "exact",
    filters: [
      { col: "user_id", op: "eq", val: users.b.id },
      { col: "is_read", op: "eq", val: false },
    ],
  });
  assert.ok((countB.count ?? 0) >= 1, "B's unread count should include it");

  // A's read of the notifications table is scoped to A: B's rows never leak.
  const listA = await query("a", {
    table: "notifications",
    action: "select",
      });
  assert.ok(
    !(listA.data ?? []).some((n) => String(n.message).includes(marker)),
    "A must not see B's notifications",
  );
});

test("notifications: B can mark it read (update scoped to recipient)", async () => {
  const listB = await query("b", {
    table: "notifications",
    action: "select",
        filters: [{ col: "user_id", op: "eq", val: users.b.id }],
  });
  const target = (listB.data ?? []).find((n) =>
    String(n.message).includes(marker),
  );
  assert.ok(target, "notification should exist");

  const upd = await query("b", {
    table: "notifications",
    action: "update",
    values: { is_read: true },
    filters: [{ col: "id", op: "eq", val: target!.id }],
    returning: true,
  });
  assert.equal(upd.error, null);
  assert.equal(upd.data?.[0]?.is_read, true, "B can mark their notification read");

  // A (the actor, not the recipient) cannot flip B's notification back.
  const updA = await query("a", {
    table: "notifications",
    action: "update",
    values: { is_read: false },
    filters: [{ col: "id", op: "eq", val: target!.id }],
    returning: true,
  });
  assert.equal(
    (updA.data ?? []).length,
    0,
    "actor must not be able to update the recipient's notification",
  );
});

// ---------------------------------------------------------------------------
// 2. Friend availability
// ---------------------------------------------------------------------------

function todayWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { dayStartIso: start.toISOString(), dayEndIso: end.toISOString() };
}

test("friend-availability: no mutual follow → no availability shared", async () => {
  // Only A→B accepted (not mutual yet).
  await db
    .insert(vyvTables.follows)
    .values({ follower_id: users.a.id, following_id: users.b.id, status: "accepted" });

  const res = await callFn("a", "friend-availability", todayWindow());
  assert.equal(res.status, 200);
  assert.equal(res.json.friends.length, 0, "one-way follow must not share availability");
});

test("friend-availability: mutual friends see real busy intervals", async () => {
  await db
    .insert(vyvTables.follows)
    .values({ follower_id: users.b.id, following_id: users.a.id, status: "accepted" });

  // B is busy 10:00-11:00 today.
  const busyStart = new Date();
  busyStart.setHours(10, 0, 0, 0);
  const busyEnd = new Date(busyStart.getTime() + 60 * 60 * 1000);
  await db.insert(vyvTables.calendar_events).values({
    user_id: users.b.id,
    title: `${marker} busy block`,
    category: "general",
    starts_at: busyStart,
    ends_at: busyEnd,
  });

  const res = await callFn("a", "friend-availability", todayWindow());
  assert.equal(res.status, 200);
  const friendB = res.json.friends.find((f: any) => f.id === users.b.id);
  assert.ok(friendB, "mutual friend B should be listed");
  const busyForB = res.json.busy.filter((b: any) => b.friendId === users.b.id);
  assert.ok(busyForB.length >= 1, "B's busy interval should be shared");
  assert.ok(
    busyForB.every((b: any) => b.title === undefined && b.notes === undefined),
    "busy intervals must be anonymized (no titles/notes)",
  );
});

test("friend-availability: calendar_visibility=private opts the friend out", async () => {
  await db.insert(vyvTables.profile_section_visibility).values({
    user_id: users.b.id,
    calendar_visibility: "private",
  });

  const res = await callFn("a", "friend-availability", todayWindow());
  assert.equal(res.status, 200);
  assert.ok(
    !res.json.friends.some((f: any) => f.id === users.b.id),
    "friend with private calendar must be omitted entirely",
  );

  // Restore for any later assertions.
  await db
    .update(vyvTables.profile_section_visibility)
    .set({ calendar_visibility: "public" })
    .where(eq(vyvTables.profile_section_visibility.user_id, users.b.id));
});

// ---------------------------------------------------------------------------
// 3. AI calendar actions (vyv-calendar-action)
// ---------------------------------------------------------------------------

let aiEventId: string;

test("vyv-calendar-action: create writes the event and an audit row", async () => {
  const res = await callFn("a", "vyv-calendar-action", {
    action: "create",
    payload: {
      title: `${marker} AI yoga`,
      starts_at: new Date(Date.now() + 3600_000).toISOString(),
      category: "wellness",
    },
    prompt: "agrega yoga a mi calendario",
  });
  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
  assert.equal(res.json.event.user_id, users.a.id);
  assert.equal(res.json.event.source, "ai");
  aiEventId = res.json.event.id;

  const audits = await db
    .select()
    .from(vyvTables.ai_calendar_audit)
    .where(eq(vyvTables.ai_calendar_audit.user_id, users.a.id));
  const created = audits.find(
    (x) => x.action === "create" && x.event_id === aiEventId,
  );
  assert.ok(created, "audit row for the create must exist");
  assert.equal(created!.prompt, "agrega yoga a mi calendario");
});

test("vyv-calendar-action: update and delete are owner-scoped and audited", async () => {
  // B cannot touch A's AI-created event.
  const updB = await callFn("b", "vyv-calendar-action", {
    action: "update",
    payload: { event_id: aiEventId, title: "hijacked" },
  });
  assert.equal(updB.status, 404, "another user must get 404 on update");

  const upd = await callFn("a", "vyv-calendar-action", {
    action: "update",
    payload: { event_id: aiEventId, title: `${marker} AI yoga (moved)` },
  });
  assert.equal(upd.status, 200);
  assert.equal(upd.json.event.title, `${marker} AI yoga (moved)`);

  const delB = await callFn("b", "vyv-calendar-action", {
    action: "delete",
    payload: { event_id: aiEventId },
  });
  assert.equal(delB.status, 404, "another user must get 404 on delete");

  const del = await callFn("a", "vyv-calendar-action", {
    action: "delete",
    payload: { event_id: aiEventId },
  });
  assert.equal(del.status, 200);

  const audits = await db
    .select()
    .from(vyvTables.ai_calendar_audit)
    .where(eq(vyvTables.ai_calendar_audit.user_id, users.a.id));
  assert.ok(
    audits.some((x) => x.action === "update" && x.event_id === aiEventId),
    "update audit row exists",
  );
  assert.ok(
    audits.some((x) => x.action === "delete" && x.event_id === aiEventId),
    "delete audit row exists",
  );
});

// ---------------------------------------------------------------------------
// 4. Web push
// ---------------------------------------------------------------------------

test("push: vapid public key is served to authenticated users", async () => {
  const res = await fetch(`${baseUrl}/push/vapid-public-key`, {
    headers: { "x-test-user": "a" },
  });
  assert.equal(res.status, 200);
  const json = (await res.json()) as { publicKey: string };
  assert.ok(json.publicKey && json.publicKey.length > 20, "public key returned");

  // A second call returns the SAME key (persisted, not regenerated).
  const res2 = await fetch(`${baseUrl}/push/vapid-public-key`, {
    headers: { "x-test-user": "b" },
  });
  const json2 = (await res2.json()) as { publicKey: string };
  assert.equal(json2.publicKey, json.publicKey);
});

test("push: subscribe stores the subscription for the caller; unsubscribe removes it", async () => {
  const endpoint = `https://push.example.test/${marker}`;
  const sub = await fetch(`${baseUrl}/push/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user": "b" },
    body: JSON.stringify({
      subscription: { endpoint, keys: { p256dh: "test-p256dh", auth: "test-auth" } },
    }),
  });
  assert.equal(sub.status, 200);

  const rows = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].user_id, users.b.id, "subscription belongs to B");

  // Malformed subscription is rejected.
  const bad = await fetch(`${baseUrl}/push/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user": "b" },
    body: JSON.stringify({ subscription: { endpoint: "not-a-url" } }),
  });
  assert.equal(bad.status, 400);

  const unsub = await fetch(`${baseUrl}/push/unsubscribe`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user": "b" },
    body: JSON.stringify({ endpoint }),
  });
  assert.equal(unsub.status, 200);
  const after = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
  assert.equal(after.length, 0, "subscription removed");
});

test("push: reminder sweep claims upcoming events exactly once", async () => {
  // B has a push subscription and an event starting in 10 minutes.
  const endpoint = `https://push.example.test/reminder-${marker}`;
  await db.insert(pushSubscriptions).values({
    user_id: users.b.id,
    endpoint,
    p256dh: "test-p256dh",
    auth: "test-auth",
  });
  const [ev] = await db
    .insert(vyvTables.calendar_events)
    .values({
      user_id: users.b.id,
      title: `Reminder test ${marker}`,
      category: "personal",
      starts_at: new Date(Date.now() + 10 * 60 * 1000),
      ends_at: new Date(Date.now() + 70 * 60 * 1000),
    })
    .returning();

  await runReminderSweep(); // send fails against the fake endpoint, but the claim must stick
  const claims = await db
    .select()
    .from(calendarRemindersSent)
    .where(eq(calendarRemindersSent.event_id, ev.id));
  assert.equal(claims.length, 1, "reminder claimed for the event");

  await runReminderSweep();
  const claims2 = await db
    .select()
    .from(calendarRemindersSent)
    .where(eq(calendarRemindersSent.event_id, ev.id));
  assert.equal(claims2.length, 1, "no double claim on second sweep");

  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
});

test("push/security: cannot notify an arbitrary user without a relationship", async () => {
  // C has no follow / plan relationship with A.
  const res = await fetch(`${baseUrl}/db/query`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user": "c" },
    body: JSON.stringify({
      table: "notifications",
      action: "insert",
      values: {
        user_id: users.a.id,
        type: "new_follower",
        message: "spam attempt",
      },
    }),
  });
  assert.equal(res.status, 403, "unrelated notification insert is rejected");
});
