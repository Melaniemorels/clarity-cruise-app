import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import {
  db,
  appUsers,
  vyvTables,
  pushSubscriptions,
  calendarRemindersSent,
  socialPlanInvites,
  socialPlans,
} from "@workspace/db";
import {
  eq,
  or,
  inArray,
  getTableColumns,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";
import { requireUser, forgetClerkUser } from "../lib/auth";

// Auth is owned by Clerk (sign-in/up, verification, password reset, OAuth all
// happen client-side against Clerk). The only server responsibility left is
// exposing the bridged internal user so the client can learn its stable
// internal UUID (app_users.id) — which every per-user query keys off.

const router: IRouter = Router();

function userShape(user: { id: string; email: string }) {
  return {
    id: user.id,
    email: user.email,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
}

// GET /api/auth/user — returns the internal (bridged) user for the Clerk session.
router.get(
  "/auth/user",
  requireUser,
  (req: Request, res: Response): void => {
    const authUser = req.authUser!;
    res.json({ data: { user: userShape(authUser) }, error: null });
  },
);

// POST /api/auth/signout — Clerk owns the browser session; this is a harmless
// no-op kept for compatibility with any lingering client callers.
router.post("/auth/signout", (_req: Request, res: Response): void => {
  res.json({ error: null });
});

// Owner columns that may reference the user across the app's tables.
const OWNER_COLUMNS = [
  "user_id",
  "actor_id",
  "follower_id",
  "following_id",
  "requester_id",
  "target_id",
  "creator_id",
  "invitee_id",
];

// Delete every row the user owns or participates in, across all app tables.
// Runs in a single transaction so a partial purge can never be committed.
async function deleteAllUserData(userId: string): Promise<void> {
  const tables = [
    ...Object.values(vyvTables),
    pushSubscriptions,
    calendarRemindersSent,
  ];
  await db.transaction(async (tx) => {
    // Invites on plans the user created reference other users as invitees, so
    // the generic owner-column sweep below would miss them. Purge them first.
    await tx.delete(socialPlanInvites).where(
      inArray(
        socialPlanInvites.plan_id,
        tx
          .select({ id: socialPlans.id })
          .from(socialPlans)
          .where(eq(socialPlans.creator_id, userId)),
      ),
    );
    for (const table of tables) {
      const cols = getTableColumns(table) as unknown as Record<
        string,
        AnyColumn
      >;
      const conds: SQL[] = [];
      for (const col of OWNER_COLUMNS) {
        if (cols[col]) conds.push(eq(cols[col], userId));
      }
      if (conds.length === 0) continue;
      await tx
        .delete(table)
        .where(conds.length === 1 ? conds[0] : or(...conds));
    }
    await tx.delete(appUsers).where(eq(appUsers.id, userId));
  });
}

// POST /api/auth/delete-account — permanently deletes the caller's account:
// all app data rows, the internal app_users bridge row, and the Clerk user.
router.post(
  "/auth/delete-account",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.authUser!.id;
    const clerkUserId = getAuth(req)?.userId;
    try {
      // Purge app data FIRST (atomically). Only then delete the Clerk user:
      // if the purge fails the user keeps a working login and can retry;
      // if the Clerk deletion fails afterwards, no personal data remains
      // (a re-login would only JIT-provision a fresh empty account).
      await deleteAllUserData(userId);
      if (clerkUserId) {
        await clerkClient.users.deleteUser(clerkUserId);
        forgetClerkUser(clerkUserId);
      }
      res.json({ error: null });
    } catch (err) {
      console.error(`[auth] delete-account failed for ${userId}:`, err);
      res.status(500).json({ error: "delete_failed" });
    }
  },
);

// POST /api/auth/signout-all — revokes every Clerk session for the caller,
// signing them out on all devices (the client then also signs out locally).
router.post(
  "/auth/signout-all",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const clerkUserId = getAuth(req)?.userId;
    if (!clerkUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const sessions = await clerkClient.sessions.getSessionList({
        userId: clerkUserId,
        status: "active",
      });
      const results = await Promise.allSettled(
        sessions.data.map((s) => clerkClient.sessions.revokeSession(s.id)),
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        console.error(
          `[auth] signout-all: ${failed.length}/${results.length} revocations failed`,
        );
        res.status(500).json({ error: "signout_all_partial" });
        return;
      }
      res.json({ error: null });
    } catch (err) {
      console.error(`[auth] signout-all failed:`, err);
      res.status(500).json({ error: "signout_all_failed" });
    }
  },
);

export default router;
