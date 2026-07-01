import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac,
  createHash,
} from "crypto";
import type { Request, Response, NextFunction } from "express";

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

export function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = getBearer(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.authUser = { id: payload.sub, email: payload.email };
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
