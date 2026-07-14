import webpush from "web-push";
import { and, eq, gt, inArray, isNull, lt, notInArray, sql } from "drizzle-orm";
import {
  db,
  vyvTables,
  pushSubscriptions,
  appConfig,
  calendarRemindersSent,
} from "@workspace/db";
import { encryptToken, decryptToken } from "./tokenCrypto";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// VAPID keys — generated once and persisted in app_config (private key
// encrypted at rest with TOKEN_ENCRYPTION_KEY, same as OAuth tokens).
// ---------------------------------------------------------------------------

const VAPID_PUBLIC = "vapid_public_key";
const VAPID_PRIVATE = "vapid_private_key";
const VAPID_SUBJECT = "mailto:push@vyv.app";

let cachedKeys: { publicKey: string; privateKey: string } | null = null;
let keysPromise: Promise<{ publicKey: string; privateKey: string }> | null =
  null;

async function loadOrCreateKeys(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const rows = await db
    .select()
    .from(appConfig)
    .where(inArray(appConfig.key, [VAPID_PUBLIC, VAPID_PRIVATE]));
  const pub = rows.find((r) => r.key === VAPID_PUBLIC)?.value;
  const privStored = rows.find((r) => r.key === VAPID_PRIVATE)?.value;
  if (pub && privStored) {
    return { publicKey: pub, privateKey: decryptToken(privStored) ?? "" };
  }
  const generated = webpush.generateVAPIDKeys();
  await db
    .insert(appConfig)
    .values([
      { key: VAPID_PUBLIC, value: generated.publicKey },
      { key: VAPID_PRIVATE, value: encryptToken(generated.privateKey) },
    ])
    .onConflictDoNothing();
  // Re-read in case a concurrent instance won the race.
  return loadOrCreateKeys();
}

export async function getVapidKeys(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  if (cachedKeys) return cachedKeys;
  if (!keysPromise) {
    keysPromise = loadOrCreateKeys()
      .then((k) => {
        cachedKeys = k;
        return k;
      })
      .catch((err) => {
        keysPromise = null;
        throw err;
      });
  }
  return keysPromise;
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push notification to every subscription the user has registered.
 * Never throws — push delivery is best-effort and must not break the caller.
 * Dead subscriptions (404/410 from the push service) are removed.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  try {
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.user_id, userId));
    if (subs.length === 0) return;

    const keys = await getVapidKeys();
    const body = JSON.stringify(payload);

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body,
            {
              vapidDetails: {
                subject: VAPID_SUBJECT,
                publicKey: keys.publicKey,
                privateKey: keys.privateKey,
              },
              TTL: 60 * 60,
            },
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.id, sub.id));
          } else {
            logger.warn({ err, userId }, "push send failed");
          }
        }
      }),
    );
  } catch (err) {
    logger.warn({ err, userId }, "sendPushToUser failed");
  }
}

// ---------------------------------------------------------------------------
// Social notification pushes (mirrors rows inserted into `notifications`)
// ---------------------------------------------------------------------------

const NOTIFICATION_TEXT: Record<
  string,
  { es: (actor: string) => string; en: (actor: string) => string }
> = {
  new_follower: {
    es: (a) => `${a} empezó a seguirte`,
    en: (a) => `${a} started following you`,
  },
  follow_request: {
    es: (a) => `${a} quiere seguirte`,
    en: (a) => `${a} wants to follow you`,
  },
  request_accepted: {
    es: (a) => `${a} aceptó tu solicitud`,
    en: (a) => `${a} accepted your request`,
  },
  plan_invite: {
    es: (a) => `${a} te invitó a un plan`,
    en: (a) => `${a} invited you to a plan`,
  },
  plan_accepted: {
    es: (a) => `${a} aceptó tu plan`,
    en: (a) => `${a} accepted your plan`,
  },
  plan_declined: {
    es: (a) => `${a} rechazó tu plan`,
    en: (a) => `${a} declined your plan`,
  },
};

async function recipientLanguage(userId: string): Promise<"es" | "en"> {
  try {
    const prefsTable = vyvTables.user_explore_preferences;
    const [prefs] = await db
      .select({ language: prefsTable.language })
      .from(prefsTable)
      .where(eq(prefsTable.user_id, userId))
      .limit(1);
    return prefs?.language === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

/**
 * Fire a push mirroring a social notification row. Fire-and-forget: callers
 * should NOT await failures — wrap in void/catch.
 */
export async function sendNotificationPush(row: {
  user_id: string;
  actor_id: string;
  type: string;
  message?: string | null;
}): Promise<void> {
  try {
    const text = NOTIFICATION_TEXT[row.type];
    if (!text) return; // types without push copy (request_rejected, like, ...)

    const [actor] = await db
      .select({
        name: vyvTables.profiles.name,
        handle: vyvTables.profiles.handle,
      })
      .from(vyvTables.profiles)
      .where(eq(vyvTables.profiles.user_id, row.actor_id))
      .limit(1);
    const actorName = actor?.name || actor?.handle || "Alguien";
    const lang = await recipientLanguage(row.user_id);

    await sendPushToUser(row.user_id, {
      title: "VYV",
      body: row.message || text[lang](actorName),
      url: "/",
      tag: `social-${row.type}`,
    });
  } catch (err) {
    logger.warn({ err }, "sendNotificationPush failed");
  }
}

// ---------------------------------------------------------------------------
// Calendar event reminders
// ---------------------------------------------------------------------------

const REMINDER_WINDOW_MIN = 15;
let reminderTimer: NodeJS.Timeout | null = null;

export async function runReminderSweep(): Promise<number> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MIN * 60 * 1000);

  // Events starting soon, for users with at least one push subscription,
  // that have not been reminded yet.
  const events = await db
    .select({
      id: vyvTables.calendar_events.id,
      user_id: vyvTables.calendar_events.user_id,
      title: vyvTables.calendar_events.title,
      starts_at: vyvTables.calendar_events.starts_at,
    })
    .from(vyvTables.calendar_events)
    .leftJoin(
      calendarRemindersSent,
      eq(calendarRemindersSent.event_id, vyvTables.calendar_events.id),
    )
    .where(
      and(
        gt(vyvTables.calendar_events.starts_at, now),
        lt(vyvTables.calendar_events.starts_at, windowEnd),
        isNull(calendarRemindersSent.event_id),
        inArray(
          vyvTables.calendar_events.user_id,
          db
            .selectDistinct({ user_id: pushSubscriptions.user_id })
            .from(pushSubscriptions),
        ),
      ),
    )
    .limit(200);

  let sent = 0;
  for (const ev of events) {
    // Claim the reminder first so concurrent sweeps never double-send.
    const claimed = await db
      .insert(calendarRemindersSent)
      .values({ event_id: ev.id, user_id: ev.user_id })
      .onConflictDoNothing()
      .returning();
    if (claimed.length === 0) continue;

    const lang = await recipientLanguage(ev.user_id);
    const minutes = Math.max(
      1,
      Math.round((ev.starts_at.getTime() - Date.now()) / 60000),
    );
    await sendPushToUser(ev.user_id, {
      title: lang === "en" ? "Upcoming event" : "Evento próximo",
      body:
        lang === "en"
          ? `"${ev.title}" starts in ${minutes} min`
          : `"${ev.title}" empieza en ${minutes} min`,
      url: "/calendar",
      tag: `reminder-${ev.id}`,
    });
    sent += 1;
  }

  // Housekeeping: drop dedupe rows older than 7 days.
  await db
    .delete(calendarRemindersSent)
    .where(
      lt(calendarRemindersSent.sent_at, sql`now() - interval '7 days'`),
    );

  return sent;
}

export function startReminderScheduler(): void {
  if (reminderTimer) return;
  const tick = async () => {
    try {
      await runReminderSweep();
    } catch (err) {
      logger.warn({ err }, "reminder sweep failed");
    }
  };
  reminderTimer = setInterval(tick, 60 * 1000);
  reminderTimer.unref();
  void tick();
  logger.info("calendar reminder scheduler started");
}
