// Tests for the simplified social layer's server endpoints:
//
// 1. /functions/v1/plan-invite-respond — the mutual-confirm "Plan Together"
//    flow: on the invitee's accept the event must be written into BOTH
//    users' calendars (idempotently); on decline no events are created.
// 2. /functions/v1/match-contacts — matching picked contacts (emails/phones)
//    to VYV profiles, never returning the caller themself.
//
// Same harness as phase1-flows: routers are mounted behind a test-only
// middleware that injects req.authUser from the x-test-user header.
//
// Run with: pnpm --filter @workspace/api-server run test

import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import { db, appUsers, vyvTables } from "@workspace/db";
import { and, eq, inArray, like, or } from "drizzle-orm";
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

async function callFn(
  asUser: "a" | "b" | "c",
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

const marker = `planinv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
    {
      user_id: a.id,
      handle: `${marker}-a`,
      name: "Plan A",
      home_timezone: "Europe/Madrid",
    },
    { user_id: b.id, handle: `${marker}-b`, name: "Plan B" },
    {
      user_id: c.id,
      handle: `${marker}-c`,
      name: "Plan C",
      phone_number: "+34 600 111 222",
    },
  ]);

  server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", () => r()));
  const addr = server.address();
  if (typeof addr === "object" && addr) baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  const ids = [users.a.id, users.b.id, users.c.id];
  const planRows = await db
    .select({ id: vyvTables.social_plans.id })
    .from(vyvTables.social_plans)
    .where(inArray(vyvTables.social_plans.creator_id, ids));
  const planIds = planRows.map((p) => p.id);
  if (planIds.length > 0) {
    await db
      .delete(vyvTables.social_plan_invites)
      .where(inArray(vyvTables.social_plan_invites.plan_id, planIds));
    await db
      .delete(vyvTables.social_plans)
      .where(inArray(vyvTables.social_plans.id, planIds));
  }
  await db
    .delete(vyvTables.notifications)
    .where(
      or(
        inArray(vyvTables.notifications.user_id, ids),
        inArray(vyvTables.notifications.actor_id, ids),
      ),
    );
  await db
    .delete(vyvTables.calendar_events)
    .where(inArray(vyvTables.calendar_events.user_id, ids));
  await db
    .delete(vyvTables.profiles)
    .where(like(vyvTables.profiles.handle, `${marker}%`));
  await db.delete(appUsers).where(inArray(appUsers.id, ids));
  server.close();
});

async function createPlan(creatorId: string, inviteeId: string, title: string) {
  const [plan] = await db
    .insert(vyvTables.social_plans)
    .values({
      creator_id: creatorId,
      title,
      plan_date: "2026-08-20",
      start_minute: 17 * 60 + 30,
      end_minute: 19 * 60,
    })
    .returning();
  await db
    .insert(vyvTables.social_plan_invites)
    .values({ plan_id: plan.id, invitee_id: inviteeId });
  return plan;
}

async function eventsFor(userId: string, externalId: string) {
  return db
    .select()
    .from(vyvTables.calendar_events)
    .where(
      and(
        eq(vyvTables.calendar_events.user_id, userId),
        eq(vyvTables.calendar_events.external_id, externalId),
      ),
    );
}

test("accepting a plan invite writes the event into both calendars", async () => {
  const plan = await createPlan(users.a.id, users.b.id, "Coffee together");
  const res = await callFn("b", "plan-invite-respond", {
    plan_id: plan.id,
    accepted: true,
  });
  assert.equal(res.status, 200);

  const externalId = `social_plan:${plan.id}`;
  const creatorEvents = await eventsFor(users.a.id, externalId);
  const inviteeEvents = await eventsFor(users.b.id, externalId);
  assert.equal(creatorEvents.length, 1);
  assert.equal(inviteeEvents.length, 1);
  assert.equal(creatorEvents[0].title, "Coffee together");
  // Same shared instant for both participants.
  assert.equal(
    creatorEvents[0].starts_at.toISOString(),
    inviteeEvents[0].starts_at.toISOString(),
  );
  // 17:30 Europe/Madrid in August (CEST, UTC+2) = 15:30 UTC.
  assert.equal(
    creatorEvents[0].starts_at.toISOString(),
    "2026-08-20T15:30:00.000Z",
  );

  const [invite] = await db
    .select()
    .from(vyvTables.social_plan_invites)
    .where(eq(vyvTables.social_plan_invites.plan_id, plan.id));
  assert.equal(invite.status, "accepted");

  // Creator got a plan_accepted notification.
  const notifs = await db
    .select()
    .from(vyvTables.notifications)
    .where(
      and(
        eq(vyvTables.notifications.user_id, users.a.id),
        eq(vyvTables.notifications.type, "plan_accepted"),
      ),
    );
  assert.equal(notifs.length, 1);

  // Idempotent: accepting again does not duplicate events.
  const again = await callFn("b", "plan-invite-respond", {
    plan_id: plan.id,
    accepted: true,
  });
  assert.equal(again.status, 200);
  assert.equal(again.json.alreadyResponded, true);
  assert.equal((await eventsFor(users.a.id, externalId)).length, 1);
  assert.equal((await eventsFor(users.b.id, externalId)).length, 1);
  // ...and does not duplicate the creator's notification either.
  const notifsAfter = await db
    .select()
    .from(vyvTables.notifications)
    .where(
      and(
        eq(vyvTables.notifications.user_id, users.a.id),
        eq(vyvTables.notifications.type, "plan_accepted"),
      ),
    );
  assert.equal(notifsAfter.length, 1);
});

test("declining a plan invite creates no calendar events", async () => {
  const plan = await createPlan(users.a.id, users.b.id, "Declined plan");
  const res = await callFn("b", "plan-invite-respond", {
    plan_id: plan.id,
    accepted: false,
  });
  assert.equal(res.status, 200);
  const externalId = `social_plan:${plan.id}`;
  assert.equal((await eventsFor(users.a.id, externalId)).length, 0);
  assert.equal((await eventsFor(users.b.id, externalId)).length, 0);
  const [invite] = await db
    .select()
    .from(vyvTables.social_plan_invites)
    .where(eq(vyvTables.social_plan_invites.plan_id, plan.id));
  assert.equal(invite.status, "declined");
});

test("only the invitee can respond to a plan invite", async () => {
  const plan = await createPlan(users.a.id, users.b.id, "Not yours");
  const res = await callFn("c", "plan-invite-respond", {
    plan_id: plan.id,
    accepted: true,
  });
  assert.equal(res.status, 404);
});

test("match-contacts finds users by email and phone, never the caller", async () => {
  const res = await callFn("a", "match-contacts", {
    emails: [users.b.email.toUpperCase(), users.a.email],
    phones: ["600-11-12-22", "not a phone"],
  });
  assert.equal(res.status, 200);
  const ids = (res.json.matches as { user_id: string }[]).map((m) => m.user_id);
  assert.ok(ids.includes(users.b.id), "email match found");
  assert.ok(ids.includes(users.c.id), "phone match found");
  assert.ok(!ids.includes(users.a.id), "caller excluded");
  // Response only exposes public profile fields.
  const match = res.json.matches[0];
  assert.deepEqual(
    Object.keys(match).sort(),
    ["handle", "name", "photo_url", "user_id"].sort(),
  );
});
