import { Router, type IRouter, type Request, type Response } from "express";
import { db, vyvTables } from "@workspace/db";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// generate-perfect-day
// ---------------------------------------------------------------------------

interface RecommendationProfile {
  workoutStyle: "normal" | "hotel_short" | "walk_mobility";
  workoutMinutesTarget: number;
  focusBlocks: "normal" | "lighter";
  recoveryPriority: "normal" | "high";
  tone: "standard" | "gentle";
}

function buildSystemPrompt(context: {
  timeOfDay: string;
  sleepHours: number;
  todayWorkoutMinutes: number;
  todaySteps: number;
  focusSessionsToday: number;
  upcomingEvents: { title: string; category: string; startsAt: string }[];
  userLanguage: string;
  travelMode: {
    status: string;
    isTraveling: boolean;
    detectedReason?: string;
    timezoneHome: string | null;
    timezoneCurrent: string | null;
    allowAutoTimezoneShift: boolean;
  };
  profile: RecommendationProfile;
}): string {
  let energyLevel = "medium";
  if (context.sleepHours < 6) energyLevel = "low";
  else if (context.sleepHours >= 7.5) energyLevel = "high";

  const hasWorkoutData = context.todayWorkoutMinutes > 0;
  const hasStepsData = context.todaySteps > 0;
  const lang = context.userLanguage || "en";
  const langInstruction =
    lang === "es"
      ? "IDIOMA OBLIGATORIO: Responde EXCLUSIVAMENTE en español."
      : "MANDATORY LANGUAGE: Respond EXCLUSIVELY in English.";

  return `You are an AI assistant inside VYV, a premium wellness and productivity application.

${langInstruction}

Generate the user's ideal day using only the available data below.

AVAILABLE USER DATA:
- Current time of day: ${context.timeOfDay}
- Energy level: ${energyLevel} (derived from ${context.sleepHours} hours of sleep)
- Today's workout: ${hasWorkoutData ? context.todayWorkoutMinutes + " minutes completed" : "No data available"}
- Today's steps: ${hasStepsData ? context.todaySteps.toLocaleString() : "No data available"}
- Focus sessions today: ${context.focusSessionsToday}
- Calendar commitments: ${context.upcomingEvents.length > 0 ? context.upcomingEvents.map((e) => e.title + " (" + e.category + ") at " + e.startsAt).join("; ") : "No scheduled events"}
- TRAVEL STATUS: ${context.travelMode.isTraveling ? "TRAVELING" : "At home"}

STRICT GUIDELINES:
- Adapt recommendations strictly to the user's real data above
- Do NOT invent metrics or assume performance levels
- If data is missing, provide flexible and conservative suggestions
- Avoid overwhelming schedules
- Prioritize balance, mental clarity, and sustainable habits
- RESPECT existing calendar commitments—schedule around them, never over them

STRUCTURE:
Organize into 4 time blocks: morning, midday, afternoon, evening.

STYLE REQUIREMENTS:
- NO EMOJIS anywhere in the response
- Use professional, formal language
- Keep titles short and professional (2-4 words max)
- Descriptions should be clear and actionable (1 sentence)

ACTIVITY TYPES (use exactly these strings): work, movement, nutrition, rest, mindfulness

OUTPUT FORMAT (strict JSON, NO emojis):
{
  "energyLevel": "${energyLevel}",
  "sleepHours": ${context.sleepHours},
  "blocks": [
    { "period": "morning", "activities": [ { "type": "mindfulness", "title": "Morning Focus", "description": "...", "duration": "10 min" } ] },
    { "period": "midday", "activities": [] },
    { "period": "afternoon", "activities": [] },
    { "period": "evening", "activities": [] }
  ],
  "closing": { "type": "reflection", "text": "One reflective question or affirmation" }
}`;
}

router.post(
  "/functions/v1/generate-perfect-day",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.authUser!.id;
    const userLanguage = req.body?.userLanguage || "en";

    try {
      const today = new Date().toISOString().split("T")[0];
      const now = new Date();

      const [healthRows, events, scheduleRows, profileRows] = await Promise.all([
        db
          .select()
          .from(vyvTables.health_daily)
          .where(
            and(
              eq(vyvTables.health_daily.user_id, userId),
              eq(vyvTables.health_daily.date, today),
            ),
          )
          .limit(1),
        db
          .select()
          .from(vyvTables.calendar_events)
          .where(
            and(
              eq(vyvTables.calendar_events.user_id, userId),
              gte(vyvTables.calendar_events.starts_at, new Date(`${today}T00:00:00`)),
              lte(vyvTables.calendar_events.starts_at, new Date(`${today}T23:59:59`)),
            ),
          )
          .orderBy(vyvTables.calendar_events.starts_at),
        db
          .select()
          .from(vyvTables.schedule_blocks)
          .where(
            and(
              eq(vyvTables.schedule_blocks.user_id, userId),
              gte(vyvTables.schedule_blocks.start_at, new Date(`${today}T00:00:00`)),
              lte(vyvTables.schedule_blocks.start_at, new Date(`${today}T23:59:59`)),
            ),
          ),
        db
          .select()
          .from(vyvTables.profiles)
          .where(eq(vyvTables.profiles.user_id, userId))
          .limit(1),
      ]);

      const healthData = healthRows[0];
      const profileData = profileRows[0];

      const allowAutoShift = profileData?.allow_auto_timezone_shift !== false;
      const userTimezone = allowAutoShift
        ? profileData?.current_timezone || profileData?.home_timezone
        : profileData?.home_timezone;
      let localHour: number;
      if (userTimezone) {
        try {
          localHour = parseInt(
            now.toLocaleString("en-US", {
              timeZone: userTimezone,
              hour12: false,
              hour: "2-digit",
            }),
            10,
          );
        } catch {
          localHour = now.getUTCHours();
        }
      } else {
        localHour = now.getUTCHours();
      }

      let timeOfDay = "morning";
      if (localHour >= 12 && localHour < 14) timeOfDay = "midday";
      else if (localHour >= 14 && localHour < 18) timeOfDay = "afternoon";
      else if (localHour >= 18) timeOfDay = "evening";

      const isTraveling = profileData?.is_traveling || false;
      const usualWorkoutMinutes = healthData?.workout_minutes || 30;
      const travelIntensity = profileData?.travel_intensity || "medium";

      let recProfile: RecommendationProfile;
      if (!isTraveling) {
        recProfile = {
          workoutStyle: "normal",
          workoutMinutesTarget: usualWorkoutMinutes,
          focusBlocks: "normal",
          recoveryPriority: "normal",
          tone: "standard",
        };
      } else {
        const factor =
          travelIntensity === "low" ? 0.5 : travelIntensity === "high" ? 0.8 : 0.65;
        recProfile = {
          workoutStyle: travelIntensity === "low" ? "walk_mobility" : "hotel_short",
          workoutMinutesTarget: Math.max(10, Math.round(usualWorkoutMinutes * factor)),
          focusBlocks: "lighter",
          recoveryPriority: "high",
          tone: "gentle",
        };
      }

      const sleepHours = healthData?.sleep_minutes
        ? Math.round((healthData.sleep_minutes / 60) * 10) / 10
        : 7;

      const context = {
        timeOfDay,
        todayWorkoutMinutes: healthData?.workout_minutes || 0,
        todaySteps: healthData?.steps || 0,
        sleepHours,
        upcomingEvents: events.map((e) => ({
          title: e.title,
          category: e.category,
          startsAt: new Date(e.starts_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),
        focusSessionsToday: scheduleRows.length,
        userLanguage,
        travelMode: {
          status: profileData?.travel_mode_status || "auto",
          isTraveling,
          detectedReason: profileData?.travel_detected_reason || undefined,
          timezoneHome: profileData?.home_timezone || null,
          timezoneCurrent: profileData?.current_timezone || null,
          allowAutoTimezoneShift: allowAutoShift,
        },
        profile: recProfile,
      };

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: buildSystemPrompt(context) },
              {
                text: "Generate my perfect day plan based on my current context. Make it feel supportive and achievable, not overwhelming.",
              },
            ],
          },
        ],
        config: { responseMimeType: "application/json", maxOutputTokens: 8192 },
      });

      const content = response.text ?? "{}";
      let perfectDay: unknown;
      try {
        let jsonStr = content;
        if (jsonStr.includes("```")) {
          jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");
        }
        perfectDay = JSON.parse(jsonStr.trim());
      } catch {
        perfectDay = {
          blocks: [
            {
              period: "morning",
              activities: [
                {
                  type: "mindfulness",
                  title: "Morning Stillness",
                  description: "Five minutes of deep breathing.",
                  duration: "5 min",
                },
              ],
            },
            { period: "midday", activities: [] },
            { period: "afternoon", activities: [] },
            { period: "evening", activities: [] },
          ],
          closing: {
            type: "reflection",
            text: "What moment today brought you the most peace?",
          },
        };
      }

      res.json({
        ...(perfectDay as Record<string, unknown>),
        generatedAt: new Date().toISOString(),
        context,
      });
    } catch (err) {
      req.log?.error({ err }, "generate-perfect-day failed");
      res
        .status(500)
        .json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

// ---------------------------------------------------------------------------
// explore-feed
// ---------------------------------------------------------------------------

interface ExploreItemRow {
  id: string;
  title: string;
  source: string;
  url: string;
  duration_min: number | null;
  category: string;
  tags: string[] | null;
  language: string | null;
  creator: string | null;
  thumbnail: string | null;
  is_verified: boolean;
  popularity_score: number;
  created_at: Date | string;
}

interface Prefs {
  language: string | null;
  goals: string[];
  preferred_tags: string[];
  blocked_creators: string[];
}

function scoreItem(
  item: ExploreItemRow,
  prefs: Prefs,
  topTags: string[],
  recentCategories: string[],
): number {
  const preferred = prefs.preferred_tags ?? [];
  const tags = item.tags ?? [];
  const tagHits =
    tags.filter((t) => preferred.includes(t)).length * 3 +
    tags.filter((t) => topTags.includes(t)).length * 2;
  const catBoost = recentCategories.includes(item.category) ? 1.2 : 1.0;
  const verifiedBoost = item.is_verified ? 1.15 : 1.0;
  const langBoost =
    !prefs.language || !item.language
      ? 1.0
      : prefs.language === item.language
        ? 1.1
        : 0.9;
  const pop = item.popularity_score ?? 0.4;
  return (tagHits + pop * 2) * catBoost * verifiedBoost * langBoost;
}

function diversify<T>(sorted: T[], rate = 0.18): T[] {
  const res: T[] = [];
  const pool = [...sorted];
  while (pool.length) {
    const pickRandom = Math.random() < rate;
    const idx = pickRandom
      ? Math.floor(Math.random() * Math.min(pool.length, 12))
      : 0;
    res.push(pool.splice(idx, 1)[0]);
  }
  return res;
}

router.post(
  "/functions/v1/explore-feed",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.authUser!.id;
    const body = req.body ?? {};
    const mode: string = body.mode ?? "for_you";

    try {
      if (mode === "log_event") {
        const { item_id, event } = body;
        if (!item_id || !event) {
          res.status(400).json({ error: "Missing item_id or event" });
          return;
        }
        await db
          .insert(vyvTables.user_item_events)
          .values({ user_id: userId, item_id, event });
        res.json({ ok: true });
        return;
      }

      const category: string | null = body.category ?? null;
      const page: number = body.page ?? 0;
      const pageSize: number = Math.min(body.pageSize ?? 8, 50);

      const [prefsRows, eventRows, itemRows] = await Promise.all([
        db
          .select()
          .from(vyvTables.user_explore_preferences)
          .where(eq(vyvTables.user_explore_preferences.user_id, userId))
          .limit(1),
        db
          .select({
            item_id: vyvTables.user_item_events.item_id,
            event: vyvTables.user_item_events.event,
          })
          .from(vyvTables.user_item_events)
          .where(eq(vyvTables.user_item_events.user_id, userId))
          .orderBy(desc(vyvTables.user_item_events.created_at))
          .limit(600),
        db
          .select()
          .from(vyvTables.explore_items)
          .orderBy(desc(vyvTables.explore_items.created_at))
          .limit(200),
      ]);

      const prefsRow = prefsRows[0];
      const prefs: Prefs = {
        language: prefsRow?.language ?? null,
        goals: prefsRow?.goals ?? [],
        preferred_tags: prefsRow?.preferred_tags ?? [],
        blocked_creators: prefsRow?.blocked_creators ?? [],
      };

      const events = eventRows;
      const allItems = itemRows as unknown as ExploreItemRow[];

      const pool = category
        ? allItems.filter((i) => i.category === category)
        : allItems;

      const seenIds = new Set(
        events
          .filter((e) => ["seen", "open", "dismiss"].includes(e.event))
          .map((e) => e.item_id),
      );
      const openedCategories = events
        .filter((e) => ["open", "save"].includes(e.event))
        .slice(0, 30)
        .map((e) => allItems.find((i) => i.id === e.item_id)?.category)
        .filter(Boolean) as string[];
      const recentCategories = [...new Set(openedCategories)];
      const topTags = [
        ...new Set(
          events
            .filter((e) => ["open", "save"].includes(e.event))
            .slice(0, 20)
            .flatMap(
              (e) => allItems.find((i) => i.id === e.item_id)?.tags ?? [],
            ),
        ),
      ];
      const blockedCreators = new Set(prefs.blocked_creators ?? []);
      const savedIds = new Set(
        events.filter((e) => e.event === "save").map((e) => e.item_id),
      );

      const filtered = pool.filter((item) => {
        if (blockedCreators.has(item.creator ?? "")) return false;
        if (seenIds.has(item.id) && !savedIds.has(item.id)) return false;
        return true;
      });

      const candidates =
        filtered.length < pageSize
          ? pool.filter((item) => !blockedCreators.has(item.creator ?? ""))
          : filtered;

      const ranked = candidates
        .map((item) => ({
          item,
          score: scoreItem(item, prefs, topTags, recentCategories),
        }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.item);

      const usedCreators = new Set<string>();
      const deduped: ExploreItemRow[] = [];
      for (const it of ranked) {
        const c = it.creator ?? "";
        if (c && usedCreators.has(c)) continue;
        deduped.push(it);
        if (c) usedCreators.add(c);
        if (deduped.length >= pageSize * 4) break;
      }

      const explorationRate = mode === "for_you" ? 0.12 : 0.2;
      const mixed = diversify(deduped, explorationRate);

      const start = mode === "see_all" ? page * pageSize : 0;
      const result = mixed.slice(start, start + pageSize);
      const hasMore = mode === "see_all" ? start + pageSize < mixed.length : false;

      res.json({
        items: result,
        nextPage: hasMore ? page + 1 : null,
        total: mixed.length,
      });
    } catch (err) {
      req.log?.error({ err }, "explore-feed failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ---------------------------------------------------------------------------
// moderate-content (stub — always approve)
// ---------------------------------------------------------------------------

router.post(
  "/functions/v1/moderate-content",
  requireUser,
  (_req: Request, res: Response): void => {
    res.json({ approved: true });
  },
);

export default router;
