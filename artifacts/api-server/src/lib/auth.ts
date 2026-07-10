import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, appUsers, vyvTables } from "@workspace/db";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Identity bridge: Clerk <-> internal app_users.id (UUID)
//
// Auth is handled by Clerk. Clerk user ids are opaque strings ("user_..."),
// but every per-user table in this app keys off a UUID. `app_users.clerk_user_id`
// maps the Clerk id to a stable internal UUID (`app_users.id`), and that UUID is
// what the rest of the API (db.ts, functions.ts, storage.ts) treats as the user
// id. This keeps per-user data isolation intact across sessions and providers.
// ---------------------------------------------------------------------------

export interface AuthedUser {
  id: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthedUser;
    }
  }
}

export function getBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

// Resolved Clerk-id -> internal-user cache. Entries are only added after a
// successful resolution, so a transient DB/Clerk failure is retried on the
// next request.
const clerkUserCache = new Map<string, AuthedUser>();

async function fetchClerkEmail(clerkUserId: string): Promise<string> {
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ||
      clerkUser.emailAddresses?.[0]?.emailAddress;
    if (email) return email.toLowerCase().trim();
  } catch {
    /* fall through to a synthetic address */
  }
  return `${clerkUserId}@clerk.local`;
}

// Best-effort profile seeding so the app has a handle to work with.
async function seedProfile(userId: string, email: string): Promise<void> {
  const handleBase = email.split("@")[0] || "user";
  let handle = handleBase.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30);
  if (!handle) handle = `user_${userId.slice(0, 8)}`;
  try {
    await db
      .insert(vyvTables.profiles)
      .values({ user_id: userId, handle })
      .onConflictDoNothing();
  } catch {
    try {
      await db
        .insert(vyvTables.profiles)
        .values({ user_id: userId, handle: `${handle}_${userId.slice(0, 4)}` })
        .onConflictDoNothing();
    } catch {
      /* profile seeding is best-effort */
    }
  }
}

// Look up (or just-in-time provision) the internal user for a Clerk id.
async function resolveInternalUser(
  clerkUserId: string,
): Promise<AuthedUser | null> {
  const cached = clerkUserCache.get(clerkUserId);
  if (cached) return cached;

  const [existing] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.clerkUserId, clerkUserId))
    .limit(1);
  if (existing) {
    const resolved = { id: existing.id, email: existing.email };
    clerkUserCache.set(clerkUserId, resolved);
    return resolved;
  }

  let email = await fetchClerkEmail(clerkUserId);

  // Link a pre-existing row created under the legacy email/password auth —
  // but ONLY if it has not already been claimed by another Clerk identity.
  // Rebinding a row that already carries a different clerk_user_id would hand
  // one user's data to another, so in that case we provision a fresh, isolated
  // row keyed on a synthetic collision-free email instead.
  const [byEmail] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.email, email))
    .limit(1);
  if (byEmail) {
    if (byEmail.clerkUserId === clerkUserId) {
      const resolved = { id: byEmail.id, email: byEmail.email };
      clerkUserCache.set(clerkUserId, resolved);
      return resolved;
    }
    if (!byEmail.clerkUserId) {
      await db
        .update(appUsers)
        .set({ clerkUserId })
        .where(eq(appUsers.id, byEmail.id));
      const resolved = { id: byEmail.id, email: byEmail.email };
      clerkUserCache.set(clerkUserId, resolved);
      return resolved;
    }
    // Email already linked to a different Clerk identity — do NOT rebind.
    console.warn(
      `[auth] email ${email} already linked to a different Clerk id; ` +
        `provisioning an isolated account for ${clerkUserId}`,
    );
    email = `${clerkUserId}@clerk.local`;
  }

  const [created] = await db
    .insert(appUsers)
    .values({ email, clerkUserId })
    .onConflictDoNothing()
    .returning();

  if (!created) {
    // Concurrent request won the insert; re-read the winner.
    const [again] = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.clerkUserId, clerkUserId))
      .limit(1);
    if (again) {
      const resolved = { id: again.id, email: again.email };
      clerkUserCache.set(clerkUserId, resolved);
      return resolved;
    }
    const [againByEmail] = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.email, email))
      .limit(1);
    if (againByEmail) {
      const resolved = { id: againByEmail.id, email: againByEmail.email };
      clerkUserCache.set(clerkUserId, resolved);
      return resolved;
    }
    return null;
  }

  await seedProfile(created.id, created.email);

  const resolved = { id: created.id, email: created.email };
  clerkUserCache.set(clerkUserId, resolved);
  return resolved;
}

// Populates req.authUser from the Clerk session (cookie on web, bearer on
// mobile). Never blocks the request — unauthenticated requests simply proceed
// without an authUser and are rejected downstream by requireUser where needed.
export async function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(req);
    const clerkUserId = auth?.userId;
    if (clerkUserId) {
      const user = await resolveInternalUser(clerkUserId);
      if (user) req.authUser = user;
    }
  } catch (err) {
    // Treat as unauthenticated, but never silently: a swallowed error here
    // (e.g. a failing app_users query) turns every request into a 401 with
    // no trace, which is extremely hard to debug.
    console.warn(`[auth] attachUser failed, treating as unauthenticated: ${String(err)}`);
  }
  next();
}

export function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.authUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
