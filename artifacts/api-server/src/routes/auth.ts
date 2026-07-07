import { Router, type IRouter, type Request, type Response } from "express";
import { requireUser } from "../lib/auth";

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

export default router;
