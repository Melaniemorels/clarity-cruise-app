import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac,
  createHash,
} from "crypto";
import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, appUsers } from "@workspace/db";
import { eq } from "drizzle-orm";

// The JWT signing key is derived deterministically from DATABASE_URL so it is
// stable across restarts without requiring an extra managed secret. Override by
// setting SESSION_SECRET explicitly.
const SIGNING_KEY =
  process.env.SESSION_SECRET ||
  createHash("sha256")
    .update((process.env.DATABASE_URL || "vyv-dev") + "|vyv-jwt")
    .digest("hex");

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// --- Password hashing (scrypt) ---------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, "hex");
  if (keyBuf.length !== derived.length) return false;
  return timingSafeEqual(keyBuf, derived);
}

// --- JWT (HMAC-SHA256, no external deps) -----------------------------------

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlJson(obj: unknown): string {
  return b64url(JSON.stringify(obj));
}

export interface TokenPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export function signToken(userId: string, email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload: TokenPayload = {
    sub: userId,
    email,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const head = b64urlJson(header);
  const body = b64urlJson(payload);
  const sig = b64url(
    createHmac("sha256", SIGNING_KEY).update(`${head}.${body}`).digest(),
  );
  return `${head}.${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  const expected = b64url(
    createHmac("sha256", SIGNING_KEY).update(`${head}.${body}`).digest(),
  );
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64").toString("utf8"),
    ) as TokenPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// --- Express helpers --------------------------------------------------------

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

// Maps a Clerk identity to this app's stable UUID. All per-user tables key off
// a UUID, but Clerk ids are opaque strings ("user_..."), so we provision (JIT)
// an `app_users` row per Clerk user and use its UUID as the app user id.
const clerkUserCache = new Map<string, AuthedUser>();

export async function resolveAppUser(clerkUserId: string): Promise<AuthedUser> {
  const cached = clerkUserCache.get(clerkUserId);
  if (cached) return cached;

  const [existing] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.clerkId, clerkUserId))
    .limit(1);
  if (existing) {
    const v = { id: existing.id, email: existing.email };
    clerkUserCache.set(clerkUserId, v);
    return v;
  }

  // First time we see this Clerk user — fetch their email and provision a row.
  let email = "";
  try {
    const cu = await clerkClient.users.getUser(clerkUserId);
    email =
      cu.primaryEmailAddress?.emailAddress ||
      cu.emailAddresses?.[0]?.emailAddress ||
      "";
  } catch {
    /* fall through to synthetic email */
  }
  const normEmail = (email || `${clerkUserId}@clerk.vyv.local`).toLowerCase().trim();

  // Link to a legacy row with the same email ONLY if it has not already been
  // claimed by another Clerk identity. Rebinding a row that already carries a
  // different clerk_id would hand one user's data to another, so in that case
  // we provision a fresh row instead of overwriting the link.
  const [byEmail] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.email, normEmail))
    .limit(1);

  let row;
  if (byEmail && byEmail.clerkId === clerkUserId) {
    row = byEmail;
  } else if (byEmail && !byEmail.clerkId) {
    [row] = await db
      .update(appUsers)
      .set({ clerkId: clerkUserId })
      .where(eq(appUsers.id, byEmail.id))
      .returning();
  } else if (byEmail) {
    // Email already linked to a different Clerk identity — do NOT rebind.
    // Provision a distinct row keyed on a synthetic, collision-free email so
    // this Clerk user gets an isolated account.
    console.warn(
      `[auth] email ${normEmail} already linked to a different Clerk id; ` +
        `provisioning an isolated account for ${clerkUserId}`,
    );
    [row] = await db
      .insert(appUsers)
      .values({
        email: `${clerkUserId}@clerk.vyv.local`,
        clerkId: clerkUserId,
      })
      .returning();
  } else {
    [row] = await db
      .insert(appUsers)
      .values({ email: normEmail, clerkId: clerkUserId })
      .returning();
  }

  const v = { id: row.id, email: row.email };
  clerkUserCache.set(clerkUserId, v);
  return v;
}

// Resolves the authenticated Clerk session (cookie for web, bearer for mobile)
// into `req.authUser` with this app's UUID. clerkMiddleware must run first.
export async function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = getAuth(req);
    if (userId) {
      req.authUser = await resolveAppUser(userId);
    }
  } catch {
    /* unauthenticated — leave req.authUser undefined */
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
