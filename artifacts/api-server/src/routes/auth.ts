import { Router, type IRouter, type Request, type Response } from "express";
import { db, vyvTables } from "@workspace/db";
import { appUsers } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireUser,
} from "../lib/auth";

const router: IRouter = Router();

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

function sessionShape(user: { id: string; email: string }, token: string) {
  const now = Math.floor(Date.now() / 1000);
  const userObj = {
    id: user.id,
    email: user.email,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  return {
    access_token: token,
    token_type: "bearer",
    expires_in: TOKEN_TTL_SECONDS,
    expires_at: now + TOKEN_TTL_SECONDS,
    refresh_token: token,
    user: userObj,
  };
}

// POST /api/auth/signup { email, password, data:{ handle, name } }
router.post("/auth/signup", async (req: Request, res: Response): Promise<void> => {
  const { email, password, data } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: { message: "Email and password required" } });
    return;
  }
  const normEmail = String(email).toLowerCase().trim();

  const existing = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.email, normEmail))
    .limit(1);
  if (existing.length > 0) {
    res
      .status(400)
      .json({ error: { message: "User already registered", code: "user_already_exists" } });
    return;
  }

  const [created] = await db
    .insert(appUsers)
    .values({ email: normEmail, passwordHash: hashPassword(String(password)) })
    .returning();

  // Create the profile row. Handle defaults to the email local-part.
  const handleBase =
    (data?.handle as string) || normEmail.split("@")[0] || "user";
  let handle = handleBase.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30);
  if (!handle) handle = `user_${created.id.slice(0, 8)}`;

  try {
    await db.insert(vyvTables.profiles).values({
      user_id: created.id,
      handle,
      name: (data?.name as string) ?? null,
    });
  } catch {
    // Handle collision -> suffix with a fragment of the user id.
    await db.insert(vyvTables.profiles).values({
      user_id: created.id,
      handle: `${handle}_${created.id.slice(0, 4)}`,
      name: (data?.name as string) ?? null,
    });
  }

  const token = signToken(created.id, created.email);
  res.json({
    data: { user: sessionShape(created, token).user, session: sessionShape(created, token) },
    error: null,
  });
});

// POST /api/auth/signin { email, password }
router.post("/auth/signin", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: { message: "Email and password required" } });
    return;
  }
  const normEmail = String(email).toLowerCase().trim();
  const [user] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.email, normEmail))
    .limit(1);

  if (!user || !verifyPassword(String(password), user.passwordHash)) {
    res
      .status(400)
      .json({ error: { message: "Invalid login credentials", code: "invalid_credentials" } });
    return;
  }

  const token = signToken(user.id, user.email);
  res.json({
    data: { user: sessionShape(user, token).user, session: sessionShape(user, token) },
    error: null,
  });
});

// GET /api/auth/user  (validates the bearer token)
router.get(
  "/auth/user",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const authUser = req.authUser!;
    res.json({
      data: {
        user: sessionShape({ id: authUser.id, email: authUser.email }, "")
          .user,
      },
      error: null,
    });
  },
);

// POST /api/auth/signout (stateless — client discards the token)
router.post("/auth/signout", (_req: Request, res: Response): void => {
  res.json({ error: null });
});

export default router;
