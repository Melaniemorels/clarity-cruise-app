import { Router, type IRouter, type Request, type Response } from "express";
import { db, vyvTables } from "@workspace/db";
import { and, eq, gte, lte, desc, inArray, lt, gt, isNotNull } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";
import { requireUser } from "../lib/auth";
import {
  HEALTHY_CATEGORY_SET,
  TIME_OF_DAY_CATEGORIES,
  GOAL_CATEGORIES,
  isUnsafeWellness,
  type HealthyCategory,
} from "../lib/healthy";
import { maybeSyncYouTubeHealthy } from "./media";
import { maybeSyncSpotifyHealthy } from "./spotify";

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
  description?: string | null;
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
  preferred_duration_min: number | null;
  blocked_creators: string[];
}

// Structured, honest recommendation reason. The frontend localizes these via
// i18next — every kind maps to a real signal, never invented.
type FeedReason =
  | { kind: "goal"; goal: string }
  | { kind: "interest"; category: string }
  | { kind: "similar_saved"; category: string }
  | { kind: "more_like_this" }
  | { kind: "fits_gap"; minutes: number }
  | { kind: "time_of_day"; timeOfDay: string }
  | { kind: "curated" }
  | { kind: "popular" };

interface RankSignals {
  topTags: string[];
  recentCategories: string[];
  /** category → the user goal it serves (first matching goal wins) */
  goalCategories: Map<string, string>;
  /** categories the user manually picked as interests */
  interestCategories: Set<string>;
  savedCategories: Set<string>;
  completedCategories: Set<string>;
  dismissedCategories: Set<string>;
  moreLikeCategories: Set<string>;
  /** minutes of free time until the next calendar commitment */
  gapMinutes: number;
  timeOfDay: string;
  timeOfDayCategories: Set<string>;
}

function scoreItem(
  item: ExploreItemRow,
  prefs: Prefs,
  s: RankSignals,
): number {
  const preferred = prefs.preferred_tags ?? [];
  const tags = item.tags ?? [];
  const tagHits =
    tags.filter((t) => preferred.includes(t)).length * 3 +
    tags.filter((t) => s.topTags.includes(t)).length * 2;
  const catBoost = s.recentCategories.includes(item.category) ? 1.2 : 1.0;
  const goalBoost = s.goalCategories.has(item.category) ? 1.35 : 1.0;
  const interestBoost = s.interestCategories.has(item.category) ? 1.3 : 1.0;
  const savedBoost = s.savedCategories.has(item.category) ? 1.15 : 1.0;
  const completedBoost = s.completedCategories.has(item.category) ? 1.1 : 1.0;
  const dismissedPenalty = s.dismissedCategories.has(item.category) ? 0.8 : 1.0;
  const todBoost = s.timeOfDayCategories.has(item.category) ? 1.1 : 1.0;
  const verifiedBoost = item.is_verified ? 1.15 : 1.0;
  const langBoost =
    !prefs.language || !item.language
      ? 1.0
      : prefs.language === item.language
        ? 1.1
        : 0.9;
  // Duration fit: prefer content that fits the free calendar gap and the
  // user's preferred session length.
  let durationBoost = 1.0;
  if (item.duration_min != null) {
    durationBoost *= item.duration_min <= s.gapMinutes ? 1.08 : 0.9;
    const pref = prefs.preferred_duration_min;
    if (pref != null && pref > 0) {
      const ratio = item.duration_min / pref;
      durationBoost *= ratio >= 0.5 && ratio <= 1.5 ? 1.12 : 0.95;
    }
  }
  const pop = item.popularity_score ?? 0.4;
  return (
    (tagHits + pop * 2) *
    catBoost *
    goalBoost *
    interestBoost *
    savedBoost *
    completedBoost *
    dismissedPenalty *
    todBoost *
    verifiedBoost *
    langBoost *
    durationBoost
  );
}

/** Pick the strongest real signal behind an item as its shown reason. */
function buildReason(item: ExploreItemRow, s: RankSignals): FeedReason {
  const goal = s.goalCategories.get(item.category);
  if (goal) return { kind: "goal", goal };
  if (s.interestCategories.has(item.category)) {
    return { kind: "interest", category: item.category };
  }
  if (s.savedCategories.has(item.category)) {
    return { kind: "similar_saved", category: item.category };
  }
  if (s.moreLikeCategories.has(item.category)) return { kind: "more_like_this" };
  if (
    item.duration_min != null &&
    s.gapMinutes < 240 &&
    item.duration_min <= s.gapMinutes
  ) {
    return { kind: "fits_gap", minutes: s.gapMinutes };
  }
  if (s.timeOfDayCategories.has(item.category)) {
    return { kind: "time_of_day", timeOfDay: s.timeOfDay };
  }
  return item.is_verified ? { kind: "curated" } : { kind: "popular" };
}

/** Parse a client-sent exclude_ids list (refresh: "show me different items"). */
function parseExcludeIds(raw: unknown): Set<string> {
  if (!Array.isArray(raw)) return new Set();
  return new Set(
    raw.filter((x): x is string => typeof x === "string").slice(0, 100),
  );
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
      const requestExcluded = parseExcludeIds(body.exclude_ids);
      const uiLanguage: string | null =
        typeof body.language === "string"
          ? body.language.split("-")[0].toLowerCase()
          : null;

      const [prefsRows, eventRows, itemRows, feedbackRows, savedRows, completedRows, recCtx] =
        await Promise.all([
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
          db
            .select({
              item_id: vyvTables.recommendation_feedback.item_id,
              action: vyvTables.recommendation_feedback.action,
            })
            .from(vyvTables.recommendation_feedback)
            .where(eq(vyvTables.recommendation_feedback.user_id, userId)),
          db
            .select({
              provider_item_id:
                vyvTables.explorer_saved_items.provider_item_id,
            })
            .from(vyvTables.explorer_saved_items)
            .where(
              and(
                eq(vyvTables.explorer_saved_items.user_id, userId),
                eq(vyvTables.explorer_saved_items.provider, "vyv"),
              ),
            ),
          db
            .select({ category: vyvTables.explorer_progress.category })
            .from(vyvTables.explorer_progress)
            .where(
              and(
                eq(vyvTables.explorer_progress.user_id, userId),
                isNotNull(vyvTables.explorer_progress.completed_at),
              ),
            )
            .limit(100),
          loadRecContext(userId),
        ]);

      const prefsRow = prefsRows[0];
      const prefs: Prefs = {
        // The live UI language wins over the persisted preference so ranking
        // favours the language the user is actually seeing the app in.
        language: uiLanguage ?? prefsRow?.language ?? null,
        goals: prefsRow?.goals ?? [],
        preferred_tags: prefsRow?.preferred_tags ?? [],
        preferred_duration_min: prefsRow?.preferred_duration_min ?? null,
        blocked_creators: prefsRow?.blocked_creators ?? [],
      };

      // Keep the catalogue stocked with real wellness content: if the user
      // has YouTube/Spotify connected and the last sync is stale, refresh in
      // the background (never blocks the feed response).
      maybeSyncYouTubeHealthy(userId).catch((err) =>
        req.log?.error({ err }, "background youtube healthy sync failed"),
      );
      maybeSyncSpotifyHealthy(userId).catch((err) =>
        req.log?.error({ err }, "background spotify healthy sync failed"),
      );

      const events = eventRows;
      // Healthy-only engine: the Explorer only ever serves wellness content,
      // and never unsafe wellness (extreme diets, miracle cures…).
      const allItems = (itemRows as unknown as ExploreItemRow[]).filter(
        (i) =>
          HEALTHY_CATEGORY_SET.has(i.category) &&
          !isUnsafeWellness(i.title, [i.description ?? ""]),
      );

      let pool = category
        ? allItems.filter((i) => i.category === category)
        : allItems;

      // Strict language filtering: only serve content in the app's UI
      // language (items with unknown language pass through). The user can
      // opt in to widening the pool via the persisted
      // include_other_languages preference (off by default).
      const includeOtherLanguages =
        prefsRow?.include_other_languages === true;
      if (uiLanguage && !includeOtherLanguages) {
        pool = pool.filter((i) => !i.language || i.language === uiLanguage);
      }

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
      // Explicit negative feedback: never serve these items again.
      const excludedIds = new Set(
        feedbackRows
          .filter((f) => ["not_interested", "report"].includes(f.action))
          .map((f) => f.item_id),
      );
      // "Show me more like this": boost the tags/categories of those items.
      const moreLikeIds = new Set(
        feedbackRows
          .filter((f) => f.action === "more_like_this")
          .map((f) => f.item_id),
      );
      for (const it of allItems) {
        if (!moreLikeIds.has(it.id)) continue;
        for (const tag of it.tags ?? []) {
          if (!topTags.includes(tag)) topTags.push(tag);
        }
        if (!recentCategories.includes(it.category)) {
          recentCategories.push(it.category);
        }
      }
      // Persistent saved items (bookmarks) keep appearing even after "seen".
      const savedIds = new Set([
        ...events.filter((e) => e.event === "save").map((e) => e.item_id),
        ...savedRows.map((r) => r.provider_item_id),
      ]);

      const filtered = pool.filter((item) => {
        if (blockedCreators.has(item.creator ?? "")) return false;
        if (excludedIds.has(item.id)) return false;
        if (seenIds.has(item.id) && !savedIds.has(item.id)) return false;
        return true;
      });

      let candidates =
        filtered.length < pageSize
          ? pool.filter(
              (item) =>
                !blockedCreators.has(item.creator ?? "") &&
                !excludedIds.has(item.id),
            )
          : filtered;

      // Refresh support: the client sends the ids it is currently showing so
      // a refresh yields different items — only honored when enough other
      // eligible content remains.
      if (requestExcluded.size > 0) {
        const fresh = candidates.filter((i) => !requestExcluded.has(i.id));
        if (fresh.length >= Math.min(pageSize, 4)) candidates = fresh;
      }

      // Real ranking signals: manual goals/interests, saved + completed
      // history, negative feedback and the free calendar gap.
      const gapMinutes = nextFreeGapMinutes(recCtx.rawEvents);
      const goalCategories = new Map<string, string>();
      for (const goal of prefs.goals) {
        for (const cat of GOAL_CATEGORIES[goal] ?? []) {
          if (!goalCategories.has(cat)) goalCategories.set(cat, goal);
        }
      }
      const catOf = (id: string) =>
        allItems.find((i) => i.id === id)?.category;
      const signals: RankSignals = {
        topTags,
        recentCategories,
        goalCategories,
        interestCategories: new Set(
          prefs.preferred_tags.filter((t) => HEALTHY_CATEGORY_SET.has(t)),
        ),
        savedCategories: new Set(
          [...savedIds].map(catOf).filter(Boolean) as string[],
        ),
        completedCategories: new Set(
          completedRows.map((r) => r.category).filter(Boolean) as string[],
        ),
        dismissedCategories: new Set(
          events
            .filter((e) => e.event === "dismiss")
            .map((e) => catOf(e.item_id))
            .filter(Boolean) as string[],
        ),
        moreLikeCategories: new Set(
          [...moreLikeIds].map(catOf).filter(Boolean) as string[],
        ),
        gapMinutes,
        timeOfDay: recCtx.timeOfDay,
        timeOfDayCategories: new Set(
          TIME_OF_DAY_CATEGORIES[recCtx.timeOfDay] ??
            TIME_OF_DAY_CATEGORIES.morning,
        ),
      };

      const ranked = candidates
        .map((item) => ({
          item,
          score: scoreItem(item, prefs, signals),
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
        items: result.map((item) => ({
          ...item,
          reason: buildReason(item, signals),
        })),
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

// ---------------------------------------------------------------------------
// Shared: build a lightweight wellness context for the recommendation routes
// ---------------------------------------------------------------------------

async function loadRecContext(userId: string): Promise<{
  timeOfDay: string;
  sleepHours: number;
  workoutMinutes: number;
  steps: number;
  upcomingEvents: { title: string; category: string; startsAt: string }[];
  rawEvents: { startsAt: Date; endsAt: Date | null }[];
  isTraveling: boolean;
}> {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();

  const [healthRows, events, profileRows] = await Promise.all([
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
      .from(vyvTables.profiles)
      .where(eq(vyvTables.profiles.user_id, userId))
      .limit(1),
  ]);

  const health = healthRows[0];
  const profile = profileRows[0];

  const hour = now.getUTCHours();
  let timeOfDay = "morning";
  if (hour >= 12 && hour < 14) timeOfDay = "midday";
  else if (hour >= 14 && hour < 18) timeOfDay = "afternoon";
  else if (hour >= 18) timeOfDay = "evening";

  const sleepHours = health?.sleep_minutes
    ? Math.round((health.sleep_minutes / 60) * 10) / 10
    : 7;

  return {
    timeOfDay,
    sleepHours,
    workoutMinutes: health?.workout_minutes || 0,
    steps: health?.steps || 0,
    upcomingEvents: events.map((e) => ({
      title: e.title,
      category: e.category,
      startsAt: new Date(e.starts_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    })),
    rawEvents: events.map((e) => ({
      startsAt: new Date(e.starts_at),
      endsAt: e.ends_at ? new Date(e.ends_at) : null,
    })),
    isTraveling: profile?.is_traveling || false,
  };
}

/**
 * Minutes of free time from now until the next calendar commitment today
 * (or until a soft end-of-day cutoff when nothing else is scheduled).
 */
function nextFreeGapMinutes(
  rawEvents: { startsAt: Date; endsAt: Date | null }[],
  now = new Date(),
): number {
  const endOfDay = new Date(now);
  endOfDay.setHours(22, 30, 0, 0);
  if (endOfDay <= now) return 30; // late night — assume a short slot

  // If an event is happening right now, the free gap starts when it ends.
  let from = now;
  for (const e of rawEvents) {
    const end = e.endsAt ?? new Date(e.startsAt.getTime() + 60 * 60 * 1000);
    if (e.startsAt <= from && end > from) from = end;
  }

  const next = rawEvents
    .filter((e) => e.startsAt > from)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

  const until = next && next.startsAt < endOfDay ? next.startsAt : endOfDay;
  return Math.max(5, Math.round((until.getTime() - from.getTime()) / 60000));
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    let s = raw ?? "";
    if (s.includes("```")) {
      s = s.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    }
    return JSON.parse(s.trim()) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// generate-recommendations — media/audio recs for the Home surface
// ---------------------------------------------------------------------------

router.post(
  "/functions/v1/generate-recommendations",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.authUser!.id;
    const language: string = req.body?.language || "en";
    const goal: string | null = req.body?.goal ?? null;

    try {
      const ctx = await loadRecContext(userId);
      const langInstruction =
        language === "es"
          ? "IDIOMA OBLIGATORIO: Responde EXCLUSIVAMENTE en español."
          : "MANDATORY LANGUAGE: Respond EXCLUSIVELY in English.";

      const prompt = `You are the media curator inside VYV, a premium wellness app.
${langInstruction}
Recommend 4-6 audio experiences (music playlists, podcasts, ambient soundscapes, guided sessions) tuned to the user's current context.

CONTEXT:
- Time of day: ${ctx.timeOfDay}
- Sleep last night: ${ctx.sleepHours} hours
- Workout today: ${ctx.workoutMinutes} minutes
- Steps today: ${ctx.steps}
- Calendar: ${ctx.upcomingEvents.length ? ctx.upcomingEvents.map((e) => e.title + " (" + e.category + ")").join("; ") : "nothing scheduled"}
- Traveling: ${ctx.isTraveling ? "yes" : "no"}
- Requested goal: ${goal ?? "auto (infer from context)"}

Do NOT invent metrics. NO emojis. Keep titles short.
OUTPUT strict JSON only:
{
  "recommendations": [
    { "type": "playlist|podcast|ambient|guided", "title": "...", "description": "one sentence", "duration": "e.g. 25 min", "mood": "calm|energizing|focused|uplifting|relaxing", "externalUrl": "optional", "tags": ["tag1","tag2"] }
  ],
  "context": "one short sentence explaining why these fit right now"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json", maxOutputTokens: 4096 },
      });

      const parsed = parseJson<{
        recommendations?: unknown[];
        context?: string;
      }>(response.text ?? "{}", { recommendations: [], context: "" });

      res.json({
        recommendations: parsed.recommendations ?? [],
        context: parsed.context ?? "",
        signals: {
          timeOfDay: ctx.timeOfDay,
          sleepHours: ctx.sleepHours,
          isTraveling: ctx.isTraveling,
        },
        cached: false,
      });
    } catch (err) {
      req.log?.error({ err }, "generate-recommendations failed");
      res
        .status(500)
        .json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

// ---------------------------------------------------------------------------
// contextual-recommendations — Home + Explorer contextual discovery
//
// Healthy-only engine: recommendations are REAL catalogue items (deep links),
// never AI-invented content. Selection is grounded in the user's calendar
// (free-time gap until the next commitment) and the time of day.
// ---------------------------------------------------------------------------

const CATEGORY_MOOD: Record<string, string> = {
  Yoga: "calm",
  Pilates: "energizing",
  Ejercicios: "energizing",
  Meditación: "calm",
  Calma: "relaxing",
  Energía: "energizing",
  Nutrición: "uplifting",
  PlanesDeComida: "focused",
  Motivacional: "uplifting",
  Podcasts: "focused",
};

// Structured contextual reason: the frontend localizes it via i18next.
// gap_minutes is null when the schedule is clear (gap >= 3h).
function contextualReason(
  gapMinutes: number,
  timeOfDay: string,
): { kind: string; timeOfDay: string; minutes: number | null } {
  return {
    kind: "gap_time_of_day",
    timeOfDay,
    minutes: gapMinutes >= 180 ? null : gapMinutes,
  };
}

router.post(
  "/functions/v1/contextual-recommendations",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.authUser!.id;
    const language: string = req.body?.language || "en";
    const target: "home" | "explorer" | "both" = req.body?.target || "both";

    try {
      // Refresh the catalogue in the background if YouTube/Spotify connected.
      maybeSyncYouTubeHealthy(userId).catch((err) =>
        req.log?.error({ err }, "background youtube healthy sync failed"),
      );
      maybeSyncSpotifyHealthy(userId).catch((err) =>
        req.log?.error({ err }, "background spotify healthy sync failed"),
      );

      const [ctx, ctxPrefsRows, ctxFeedbackRows] = await Promise.all([
        loadRecContext(userId),
        db
          .select()
          .from(vyvTables.user_explore_preferences)
          .where(eq(vyvTables.user_explore_preferences.user_id, userId))
          .limit(1),
        db
          .select({
            item_id: vyvTables.recommendation_feedback.item_id,
            action: vyvTables.recommendation_feedback.action,
          })
          .from(vyvTables.recommendation_feedback)
          .where(eq(vyvTables.recommendation_feedback.user_id, userId)),
      ]);
      const wantHome = target === "home" || target === "both";
      const wantExplorer = target === "explorer" || target === "both";

      const gapMinutes = nextFreeGapMinutes(ctx.rawEvents);
      const preferredCats: HealthyCategory[] =
        TIME_OF_DAY_CATEGORIES[ctx.timeOfDay] ??
        TIME_OF_DAY_CATEGORIES.morning;

      const itemRows = await db
        .select()
        .from(vyvTables.explore_items)
        .orderBy(desc(vyvTables.explore_items.created_at))
        .limit(300);
      // Honor explicit user feedback: drop blocked creators and items the
      // user marked "not interested" / reported.
      const ctxBlockedCreators = new Set(
        ctxPrefsRows[0]?.blocked_creators ?? [],
      );
      const ctxExcludedIds = new Set(
        ctxFeedbackRows
          .filter((f) => ["not_interested", "report"].includes(f.action))
          .map((f) => f.item_id),
      );
      const healthy = (itemRows as unknown as ExploreItemRow[]).filter(
        (i) =>
          HEALTHY_CATEGORY_SET.has(i.category) &&
          !isUnsafeWellness(i.title, [i.description ?? ""]) &&
          !ctxBlockedCreators.has(i.creator ?? "") &&
          !ctxExcludedIds.has(i.id),
      );

      // Strict language filtering: only recommend content in the app's UI
      // language (items with unknown language pass through), unless the
      // user opted in to include other languages.
      const uiLang = language.split("-")[0].toLowerCase();
      const includeOtherLanguages =
        ctxPrefsRows[0]?.include_other_languages === true;
      const base = includeOtherLanguages
        ? healthy
        : healthy.filter((i) => !i.language || i.language === uiLang);

      // Fits the free gap (unknown duration → assume a short 20-min session).
      const fitting = base.filter(
        (i) => (i.duration_min ?? 20) <= Math.max(gapMinutes, 10),
      );
      let pool = fitting.length >= 4 ? fitting : base;

      // Refresh support: exclude the items currently on screen so a refresh
      // shows different eligible content (only when enough remains).
      const ctxRequestExcluded = parseExcludeIds(req.body?.exclude_ids);
      if (ctxRequestExcluded.size > 0) {
        const fresh = pool.filter((i) => !ctxRequestExcluded.has(i.id));
        if (fresh.length >= 4) pool = fresh;
      }

      // Manual personalization signals: goals, interests, preferred duration.
      const ctxGoalCategories = new Map<string, string>();
      for (const goal of ctxPrefsRows[0]?.goals ?? []) {
        for (const cat of GOAL_CATEGORIES[goal] ?? []) {
          if (!ctxGoalCategories.has(cat)) ctxGoalCategories.set(cat, goal);
        }
      }
      const ctxInterests = new Set(
        (ctxPrefsRows[0]?.preferred_tags ?? []).filter((t) =>
          HEALTHY_CATEGORY_SET.has(t),
        ),
      );
      const ctxPreferredDuration =
        ctxPrefsRows[0]?.preferred_duration_min ?? null;

      // Rank: time-of-day fit + goals + manual interests + duration fit
      // (calendar gap and preferred session length) + language, with a small
      // random jitter for variety.
      const catRank = (c: string) => {
        const idx = preferredCats.indexOf(c as HealthyCategory);
        return idx === -1 ? preferredCats.length : idx;
      };
      const ctxScore = (i: ExploreItemRow): number => {
        let score = (preferredCats.length - catRank(i.category)) * 1.0;
        if (ctxGoalCategories.has(i.category)) score += 2.5;
        if (ctxInterests.has(i.category)) score += 2.0;
        if (i.language === uiLang) score += 0.5;
        if (i.duration_min != null) {
          if (i.duration_min <= Math.max(gapMinutes, 10)) score += 0.75;
          if (ctxPreferredDuration != null && ctxPreferredDuration > 0) {
            const ratio = i.duration_min / ctxPreferredDuration;
            score += ratio >= 0.5 && ratio <= 1.5 ? 1.0 : -0.5;
          }
        }
        return score + Math.random() * 0.5;
      };
      const ranked = pool
        .map((i) => ({ i, s: ctxScore(i) }))
        .sort((a, b) => b.s - a.s)
        .map((x) => x.i);

      // Per-item reason: strongest real signal wins (goal > interest > gap
      // fit), falling back to the shared gap/time-of-day context.
      const ctxItemReason = (i: ExploreItemRow) => {
        const goal = ctxGoalCategories.get(i.category);
        if (goal) return { kind: "goal", goal };
        if (ctxInterests.has(i.category)) {
          return { kind: "interest", category: i.category };
        }
        if (
          i.duration_min != null &&
          gapMinutes < 240 &&
          i.duration_min <= gapMinutes
        ) {
          return { kind: "fits_gap", minutes: gapMinutes };
        }
        return contextualReason(gapMinutes, ctx.timeOfDay);
      };

      // One item per creator, max 2 per category, for variety.
      const usedCreators = new Set<string>();
      const perCategory = new Map<string, number>();
      const picked: ExploreItemRow[] = [];
      for (const it of ranked) {
        const creator = it.creator ?? it.id;
        const catCount = perCategory.get(it.category) ?? 0;
        if (usedCreators.has(creator) || catCount >= 2) continue;
        picked.push(it);
        usedCreators.add(creator);
        perCategory.set(it.category, catCount + 1);
        if (picked.length >= 10) break;
      }

      const toRec = (i: ExploreItemRow) => ({
        title: i.title,
        category: i.category,
        reason: ctxItemReason(i),
        duration_min: i.duration_min ?? 20,
        mood: CATEGORY_MOOD[i.category] ?? "calm",
        tags: i.tags ?? [],
        url: i.url,
        item_id: i.id,
      });

      const homeRecs = wantHome ? picked.slice(0, 4).map(toRec) : [];
      const explorerRecs = wantExplorer
        ? picked.slice(wantHome ? 4 : 0, wantHome ? 10 : 6).map(toRec)
        : [];

      res.json({
        recommendations: {
          home: homeRecs,
          explorer: explorerRecs,
        },
        signals: {
          timeOfDay: ctx.timeOfDay,
          sleepHours: ctx.sleepHours,
          isTraveling: ctx.isTraveling,
          freeGapMinutes: gapMinutes,
        },
        cached: false,
        target,
      });
    } catch (err) {
      req.log?.error({ err }, "contextual-recommendations failed");
      res
        .status(500)
        .json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

// ---------------------------------------------------------------------------
// vyv-calendar-action — apply an AI-proposed calendar create/update/delete
// ---------------------------------------------------------------------------

router.post(
  "/functions/v1/vyv-calendar-action",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.authUser!.id;
    const action: string = req.body?.action;
    const payload = req.body?.payload ?? {};
    const prompt: string | null =
      typeof req.body?.prompt === "string" ? req.body.prompt.slice(0, 2000) : null;

    const writeAudit = async (entry: {
      action: string;
      event_id?: string | null;
      before?: unknown;
      after?: unknown;
    }) => {
      try {
        await db.insert(vyvTables.ai_calendar_audit).values({
          user_id: userId,
          action: entry.action,
          event_id: entry.event_id ?? null,
          before: entry.before ?? null,
          after: entry.after ?? null,
          prompt,
        });
      } catch (auditErr) {
        req.log?.error({ err: auditErr }, "ai_calendar_audit write failed");
      }
    };

    try {
      if (action === "create") {
        if (!payload.title || !payload.starts_at) {
          res.status(400).json({ error: "Missing title or starts_at" });
          return;
        }
        const startsAt = new Date(payload.starts_at);
        const endsAt = payload.ends_at
          ? new Date(payload.ends_at)
          : new Date(startsAt.getTime() + 60 * 60 * 1000);
        const [row] = await db
          .insert(vyvTables.calendar_events)
          .values({
            user_id: userId,
            title: payload.title,
            category: payload.category || "general",
            starts_at: startsAt,
            ends_at: endsAt,
            notes: payload.notes ?? null,
            source: "ai",
          })
          .returning();
        await writeAudit({ action: "create", event_id: row?.id, after: row });
        res.json({ ok: true, event: row });
        return;
      }

      if (action === "update") {
        if (!payload.event_id) {
          res.status(400).json({ error: "Missing event_id" });
          return;
        }
        const updates: Record<string, unknown> = { updated_at: new Date() };
        if (payload.title !== undefined) updates.title = payload.title;
        if (payload.category !== undefined) updates.category = payload.category;
        if (payload.starts_at !== undefined)
          updates.starts_at = new Date(payload.starts_at);
        if (payload.ends_at !== undefined)
          updates.ends_at = new Date(payload.ends_at);
        if (payload.notes !== undefined) updates.notes = payload.notes;
        const beforeRows = await db
          .select()
          .from(vyvTables.calendar_events)
          .where(
            and(
              eq(vyvTables.calendar_events.id, payload.event_id),
              eq(vyvTables.calendar_events.user_id, userId),
            ),
          )
          .limit(1);
        const rows = await db
          .update(vyvTables.calendar_events)
          .set(updates)
          .where(
            and(
              eq(vyvTables.calendar_events.id, payload.event_id),
              eq(vyvTables.calendar_events.user_id, userId),
            ),
          )
          .returning();
        if (!rows.length) {
          res.status(404).json({ error: "Event not found" });
          return;
        }
        await writeAudit({
          action: "update",
          event_id: payload.event_id,
          before: beforeRows[0] ?? null,
          after: rows[0],
        });
        res.json({ ok: true, event: rows[0] });
        return;
      }

      if (action === "delete") {
        if (!payload.event_id) {
          res.status(400).json({ error: "Missing event_id" });
          return;
        }
        const rows = await db
          .delete(vyvTables.calendar_events)
          .where(
            and(
              eq(vyvTables.calendar_events.id, payload.event_id),
              eq(vyvTables.calendar_events.user_id, userId),
            ),
          )
          .returning();
        if (!rows.length) {
          res.status(404).json({ error: "Event not found" });
          return;
        }
        await writeAudit({
          action: "delete",
          event_id: payload.event_id,
          before: rows[0],
        });
        res.json({ ok: true });
        return;
      }

      res.status(400).json({ error: "Unknown action" });
    } catch (err) {
      req.log?.error({ err }, "vyv-calendar-action failed");
      res
        .status(500)
        .json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

// ---------------------------------------------------------------------------
// vyv-assistant — the VYV Guide chat (SSE stream, OpenAI-chunk format the
// imported frontend already parses)
// ---------------------------------------------------------------------------

router.post(
  "/functions/v1/vyv-assistant",
  requireUser,
  async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const { messages, calendarAccess } = (req.body ?? {}) as {
      messages?: { role: "user" | "assistant"; content: string }[];
      calendarAccess?: boolean;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Missing messages" });
      return;
    }

    try {
      const [profileRows, memoryRows] = await Promise.all([
        db
          .select({ ai_memory_enabled: vyvTables.profiles.ai_memory_enabled })
          .from(vyvTables.profiles)
          .where(eq(vyvTables.profiles.user_id, userId))
          .limit(1),
        db
          .select()
          .from(vyvTables.ai_memories)
          .where(eq(vyvTables.ai_memories.user_id, userId))
          .orderBy(desc(vyvTables.ai_memories.importance_score))
          .limit(20),
      ]);
      const memoryEnabled = profileRows[0]?.ai_memory_enabled === true;

      let memoryBlock = "";
      if (memoryEnabled && memoryRows.length > 0) {
        const lines = memoryRows
          .map((m) => `- (${m.memory_type}) ${String(m.content).slice(0, 200)}`)
          .join("\n");
        memoryBlock = `
Things you remember about this user from past conversations (use them naturally, never list them back verbatim):
${lines}`;
      }

      let calendarBlock = "";
      if (calendarAccess) {
        const context = await loadRecContext(userId);
        const events = context.upcomingEvents
          .map((e) => `- ${e.startsAt} ${e.title} (${e.category})`)
          .join("\n");
        calendarBlock = `
The user granted you calendar access. Today is ${new Date().toISOString()}.
Today's events:
${events || "(no events today)"}

If — and only if — the user asks you to add, move or remove something on their
calendar, end your reply with EXACTLY ONE fenced block in this format (ISO 8601
timestamps with timezone offset):
\`\`\`vyv-proposal
{"action":"create","title":"...","starts_at":"...","ends_at":"...","category":"wellness","notes":"..."}
\`\`\`
For updates/deletes include "event_id" if known. Never mention the block itself.`;
      }

      const systemPrompt = `You are the VYV Guide — a warm, concise wellness companion inside the VYV app (calendar, perfect-day planner, healthy content).
Rules:
- ALWAYS reply in the same language the user writes in (Spanish or English).
- Be brief and supportive: 2-5 sentences, or a short numbered list (1. 2. 3.) when suggesting concrete steps.
- Focus on intentional living: movement, rest, meals, focus, small wins. No medical advice.
${memoryBlock}
${calendarBlock}`;

      const contents = messages.slice(-20).map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: String(m.content ?? "") }],
      }));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      const emit = (content: string) => {
        res.write(
          `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`,
        );
      };

      try {
        const stream = await ai.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents,
          config: { systemInstruction: systemPrompt, maxOutputTokens: 2048 },
        });
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) emit(text);
        }
      } catch (streamErr) {
        req.log?.error({ err: streamErr }, "vyv-assistant stream failed");
        emit("Sorry, I couldn't respond right now. Please try again.");
      }

      res.write("data: [DONE]\n\n");
      res.end();

      if (memoryEnabled) {
        extractAndStoreMemories(userId, messages, memoryRows).catch((memErr) =>
          req.log?.error({ err: memErr }, "ai memory extraction failed"),
        );
      }
    } catch (err) {
      req.log?.error({ err }, "vyv-assistant failed");
      if (!res.headersSent) {
        res.status(500).json({ error: "Assistant unavailable" });
      } else {
        res.end();
      }
    }
  },
);

// Fire-and-forget after each assistant exchange: ask Gemini whether the last
// user messages contain durable personal facts worth remembering, and store
// up to 2 new ones. Existing memories are passed so it only outputs NEW facts.
const MEMORY_TYPES = new Set([
  "preference",
  "goal",
  "routine",
  "relationship",
  "health",
  "work",
  "calendar",
  "interest",
  "other",
]);
const MAX_MEMORIES_PER_USER = 60;

async function extractAndStoreMemories(
  userId: string,
  messages: { role: "user" | "assistant"; content: string }[],
  existing: { content: string }[],
): Promise<void> {
  const userText = messages
    .filter((m) => m.role === "user")
    .slice(-3)
    .map((m) => String(m.content ?? "").slice(0, 500))
    .join("\n");
  if (userText.trim().length < 15) return;

  const known =
    existing.map((m) => `- ${String(m.content).slice(0, 200)}`).join("\n") ||
    "(none)";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Recent user messages in a wellness-companion chat:
"""
${userText}
"""

Already-known facts about this user:
${known}

Extract at most 2 NEW durable personal facts worth remembering long-term (stable preferences, goals, routines, relationships, health habits, work context, interests). Ignore transient moods, one-off events, small talk, and anything already known. Write each fact in the user's own language, third person, under 120 characters.

Reply with ONLY a JSON array (possibly empty), no prose:
[{"content":"...","memory_type":"preference|goal|routine|relationship|health|work|calendar|interest|other","importance_score":0.1-1.0}]`,
          },
        ],
      },
    ],
    config: {
      maxOutputTokens: 512,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
    },
  });

  const raw = (response.text ?? "").trim();
  if (!raw) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return;

  const existingNorm = new Set(
    existing.map((m) => m.content.trim().toLowerCase()),
  );
  const rows = parsed
    .slice(0, 2)
    .map((item) => {
      const content = String((item as any)?.content ?? "").trim().slice(0, 200);
      const type = String((item as any)?.memory_type ?? "other");
      const score = Number((item as any)?.importance_score);
      return {
        user_id: userId,
        content,
        memory_type: MEMORY_TYPES.has(type) ? type : "other",
        importance_score:
          Number.isFinite(score) && score > 0 && score <= 1 ? score : 0.5,
      };
    })
    .filter(
      (r) =>
        r.content.length >= 8 &&
        !existingNorm.has(r.content.trim().toLowerCase()),
    );
  if (!rows.length) return;

  const countRows = await db
    .select({ id: vyvTables.ai_memories.id })
    .from(vyvTables.ai_memories)
    .where(eq(vyvTables.ai_memories.user_id, userId));
  const remaining = MAX_MEMORIES_PER_USER - countRows.length;
  if (remaining <= 0) return;

  await db.insert(vyvTables.ai_memories).values(rows.slice(0, remaining));
}

// ---------------------------------------------------------------------------
// analyze-image — quick capture labeling (emoji + short label + category).
// Requires an authenticated user (AI-cost endpoint); the frontend has a
// graceful local fallback if this fails.
// ---------------------------------------------------------------------------

// ~8MB of base64 ≈ 6MB image; captures are small JPEG data-URLs.
const MAX_IMAGE_DATA_URL_LENGTH = 8 * 1024 * 1024;

router.post(
  "/functions/v1/analyze-image",
  requireUser,
  async (req: Request, res: Response) => {
    const { imageUrl, language } = (req.body ?? {}) as {
      imageUrl?: string;
      language?: string;
    };
    const lang = language === "en" ? "English" : "Spanish";
    const fallback = {
      emoji: "📸",
      label: language === "en" ? "Quick capture" : "Captura rápida",
      category: "otro",
    };

    if ((imageUrl?.length ?? 0) > MAX_IMAGE_DATA_URL_LENGTH) {
      res.status(413).json({ error: "Image too large" });
      return;
    }

    const match = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(
      imageUrl ?? "",
    );
    if (!match) {
      res.json(fallback);
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: match[1], data: match[2] } },
              {
                text: `Describe this photo for a wellness journal. Reply ONLY with JSON:
{"emoji":"<one emoji>","label":"<2-4 words in ${lang}>","category":"<one of: comida, ejercicio, naturaleza, social, trabajo, descanso, otro>"}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      const parsed = parseJson<{
        emoji?: string;
        label?: string;
        category?: string;
      }>(response.text ?? "{}", {});
      res.json({
        emoji: parsed.emoji || fallback.emoji,
        label: parsed.label || fallback.label,
        category: parsed.category || fallback.category,
      });
    } catch (err) {
      req.log?.error({ err }, "analyze-image failed");
      res.json(fallback);
    }
  },
);

// ---------------------------------------------------------------------------
// generate-watch-notifications — lightweight preview of watch nudges based on
// today's calendar + health signals. (Watch hardware sync is out of scope.)
// ---------------------------------------------------------------------------

router.post(
  "/functions/v1/generate-watch-notifications",
  requireUser,
  async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const { language } = (req.body ?? {}) as { language?: string };
    const lang = String(language ?? "es").startsWith("en")
      ? "English"
      : "Spanish";

    try {
      const context = await loadRecContext(userId);
      const eventCount = context.upcomingEvents.length;
      const load =
        eventCount >= 5 ? "heavy" : eventCount >= 2 ? "moderate" : "light";

      const prompt = `You generate short smartwatch wellness nudges for the VYV app.
User context: time of day ${context.timeOfDay}; slept ${context.sleepHours}h; ${context.workoutMinutes} workout minutes today; ${context.steps} steps; ${eventCount} calendar events today (${load} load).
Reply ONLY with JSON:
{"notifications":[{"notification_type":"<focus|recovery|transition|calendar>","title":"<max 6 words in ${lang}>","body":"<max 15 words in ${lang}>","context_signals":{"stress_level":"<low|moderate|high>","energy_level":"<low|moderate|high>","calendar_load":"${load}","reasoning":"<short sentence in ${lang}>"}}]}
Generate exactly 3 varied notifications.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const parsed = parseJson<{ notifications?: unknown[] }>(
        response.text ?? "{}",
        { notifications: [] },
      );
      const notifications = Array.isArray(parsed.notifications)
        ? parsed.notifications
        : [];

      res.json({
        notifications,
        todayCount: notifications.length,
        signals: {
          health: {
            sleepHours: context.sleepHours,
            hasActivityData: context.workoutMinutes > 0 || context.steps > 0,
          },
          calendar: { eventCount, load },
        },
      });
    } catch (err) {
      req.log?.error({ err }, "generate-watch-notifications failed");
      res.status(500).json({ error: "Could not generate notifications" });
    }
  },
);

// ---------------------------------------------------------------------------
// friend-availability — real busy intervals of mutual friends for one day
// ---------------------------------------------------------------------------

router.post(
  "/functions/v1/friend-availability",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.authUser!.id;
    const { dayStartIso, dayEndIso } = req.body ?? {};

    const dayStart = new Date(dayStartIso);
    const dayEnd = new Date(dayEndIso);
    if (
      Number.isNaN(dayStart.getTime()) ||
      Number.isNaN(dayEnd.getTime()) ||
      dayEnd <= dayStart ||
      dayEnd.getTime() - dayStart.getTime() > 48 * 60 * 60 * 1000
    ) {
      res.status(400).json({ error: "Invalid day range" });
      return;
    }

    try {
      // Mutual friends = accepted follows in both directions
      const [following, followers] = await Promise.all([
        db
          .select({ id: vyvTables.follows.following_id })
          .from(vyvTables.follows)
          .where(
            and(
              eq(vyvTables.follows.follower_id, userId),
              eq(vyvTables.follows.status, "accepted"),
            ),
          ),
        db
          .select({ id: vyvTables.follows.follower_id })
          .from(vyvTables.follows)
          .where(
            and(
              eq(vyvTables.follows.following_id, userId),
              eq(vyvTables.follows.status, "accepted"),
            ),
          ),
      ]);

      const followerSet = new Set(followers.map((f) => f.id));
      const mutualIds = [
        ...new Set(following.map((f) => f.id).filter((id) => followerSet.has(id))),
      ].slice(0, 50);

      if (mutualIds.length === 0) {
        res.json({ friends: [], busy: [] });
        return;
      }

      // Privacy gate: a friend only contributes availability if their
      // calendar section is shared (profile_section_visibility DB default is
      // "public"; an explicit "private" opts out) and their profile is not
      // private or suspended. Friends who don't share are omitted entirely.
      const [allProfileRows, visibilityRows] = await Promise.all([
        db
          .select({
            user_id: vyvTables.profiles.user_id,
            handle: vyvTables.profiles.handle,
            name: vyvTables.profiles.name,
            photo_url: vyvTables.profiles.photo_url,
            is_private: vyvTables.profiles.is_private,
            is_suspended: vyvTables.profiles.is_suspended,
            home_timezone: vyvTables.profiles.home_timezone,
            current_timezone: vyvTables.profiles.current_timezone,
          })
          .from(vyvTables.profiles)
          .where(inArray(vyvTables.profiles.user_id, mutualIds)),
        db
          .select({
            user_id: vyvTables.profile_section_visibility.user_id,
            calendar_visibility:
              vyvTables.profile_section_visibility.calendar_visibility,
          })
          .from(vyvTables.profile_section_visibility)
          .where(
            inArray(vyvTables.profile_section_visibility.user_id, mutualIds),
          ),
      ]);

      const calendarVisibility = new Map(
        visibilityRows.map((v) => [v.user_id, v.calendar_visibility]),
      );
      const profileRows = allProfileRows.filter(
        (p) =>
          !p.is_private &&
          !p.is_suspended &&
          (calendarVisibility.get(p.user_id) ?? "public") === "public",
      );
      const friendIds = profileRows.map((p) => p.user_id);

      if (friendIds.length === 0) {
        res.json({ friends: [], busy: [] });
        return;
      }

      // Busy = calendar events + schedule blocks overlapping the window.
      const [eventRows, blockRows] = await Promise.all([
        db
          .select({
            friend_id: vyvTables.calendar_events.user_id,
            starts_at: vyvTables.calendar_events.starts_at,
            ends_at: vyvTables.calendar_events.ends_at,
          })
          .from(vyvTables.calendar_events)
          .where(
            and(
              inArray(vyvTables.calendar_events.user_id, friendIds),
              lt(vyvTables.calendar_events.starts_at, dayEnd),
              gt(vyvTables.calendar_events.ends_at, dayStart),
            ),
          ),
        db
          .select({
            friend_id: vyvTables.schedule_blocks.user_id,
            starts_at: vyvTables.schedule_blocks.start_at,
            ends_at: vyvTables.schedule_blocks.end_at,
          })
          .from(vyvTables.schedule_blocks)
          .where(
            and(
              inArray(vyvTables.schedule_blocks.user_id, friendIds),
              lt(vyvTables.schedule_blocks.start_at, dayEnd),
              gt(vyvTables.schedule_blocks.end_at, dayStart),
            ),
          ),
      ]);

      res.json({
        friends: profileRows.map((p) => ({
          id: p.user_id,
          name: p.name || p.handle,
          avatar: p.photo_url ?? undefined,
          // Where the friend currently is takes precedence over home base.
          timezone: p.current_timezone ?? p.home_timezone ?? undefined,
        })),
        // Only busy intervals are shared — no titles, notes or categories.
        busy: [...eventRows, ...blockRows].map((b) => ({
          friendId: b.friend_id,
          starts_at: b.starts_at.toISOString(),
          ends_at: b.ends_at.toISOString(),
        })),
      });
    } catch (err) {
      req.log?.error({ err }, "friend-availability failed");
      res.status(500).json({ error: "Could not load friend availability" });
    }
  },
);

export default router;
