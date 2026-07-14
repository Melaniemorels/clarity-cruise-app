import { Router, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, pushSubscriptions } from "@workspace/db";
import { requireUser } from "../lib/auth";
import { getVapidKeys } from "../lib/webPush";

const router: Router = Router();

// Public key the browser needs to create a push subscription.
router.get(
  "/push/vapid-public-key",
  requireUser,
  async (_req: Request, res: Response) => {
    try {
      const keys = await getVapidKeys();
      res.json({ publicKey: keys.publicKey });
    } catch (err) {
      res.status(500).json({ error: "Push is not available" });
    }
  },
);

router.post(
  "/push/subscribe",
  requireUser,
  async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const sub = req.body?.subscription ?? req.body;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (
      typeof endpoint !== "string" ||
      !endpoint.startsWith("https://") ||
      typeof p256dh !== "string" ||
      typeof auth !== "string"
    ) {
      res.status(400).json({ error: "Invalid subscription" });
      return;
    }
    // Endpoint is globally unique per browser; re-subscribing (or a different
    // account on the same browser) takes ownership of it.
    await db
      .insert(pushSubscriptions)
      .values({ user_id: userId, endpoint, p256dh, auth })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { user_id: userId, p256dh, auth },
      });
    res.json({ ok: true });
  },
);

router.post(
  "/push/unsubscribe",
  requireUser,
  async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== "string" || endpoint.length === 0) {
      res.status(400).json({ error: "endpoint is required" });
      return;
    }
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.user_id, userId),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      );
    res.json({ ok: true });
  },
);

export default router;
