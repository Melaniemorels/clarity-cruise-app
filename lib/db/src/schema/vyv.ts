import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  real,
  date,
  timestamp,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// Authentication (replaces Supabase auth.users)
// ---------------------------------------------------------------------------

export const appUsers = pgTable("app_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  // Nullable: Clerk owns credentials now. Retained for any legacy rows created
  // under the old email/password (scrypt) auth.
  passwordHash: text("password_hash"),
  // Bridge to the Clerk identity. All per-user tables key off app_users.id
  // (a stable internal UUID); this column maps the external Clerk user id
  // (e.g. "user_...") to that UUID so identity survives across sessions.
  clerkUserId: text("clerk_user_id").unique(),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Profiles & social graph
// ---------------------------------------------------------------------------

export const profiles = pgTable("profiles", {
  id: id(),
  user_id: uuid("user_id").notNull().unique(),
  handle: text("handle").notNull().unique(),
  name: text("name"),
  bio: text("bio"),
  photo_url: text("photo_url"),
  is_private: boolean("is_private").default(false),
  is_suspended: boolean("is_suspended").notNull().default(false),
  is_traveling: boolean("is_traveling").notNull().default(false),
  home_timezone: text("home_timezone"),
  current_timezone: text("current_timezone"),
  allow_auto_timezone_shift: boolean("allow_auto_timezone_shift")
    .notNull()
    .default(true),
  travel_detected_reason: text("travel_detected_reason"),
  travel_intensity: text("travel_intensity").notNull().default("medium"),
  travel_mode_status: text("travel_mode_status").notNull().default("auto"),
  ai_calendar_access_enabled: boolean("ai_calendar_access_enabled")
    .notNull()
    .default(false),
  ai_memory_enabled: boolean("ai_memory_enabled").notNull().default(false),
  onboarding_completed: boolean("onboarding_completed").notNull().default(false),
  onboarding_step: text("onboarding_step").notNull().default("welcome"),
  personalization_completed: boolean("personalization_completed")
    .notNull()
    .default(false),
  profile_setup_completed: boolean("profile_setup_completed")
    .notNull()
    .default(false),
  // Onboarding personalization answers: { organize: string[], connectCalendar:
  // boolean, shareAvailability: boolean, interests: string[], aiTone:
  // "soft"|"direct", startPrivate: boolean }
  personalization: jsonb("personalization"),
  phone_number: text("phone_number"),
  phone_verified: boolean("phone_verified").notNull().default(false),
  security_onboarding_completed: boolean("security_onboarding_completed")
    .notNull()
    .default(false),
  suspended_at: timestamp("suspended_at", { withTimezone: true }),
  suspension_reason: text("suspension_reason"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const follows = pgTable("follows", {
  id: id(),
  follower_id: uuid("follower_id").notNull(),
  following_id: uuid("following_id").notNull(),
  status: text("status").notNull().default("accepted"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const followRequests = pgTable("follow_requests", {
  id: id(),
  requester_id: uuid("requester_id").notNull(),
  target_id: uuid("target_id").notNull(),
  status: text("status").notNull().default("pending"),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const handleChanges = pgTable("handle_changes", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  old_handle: text("old_handle").notNull(),
  new_handle: text("new_handle").notNull(),
  changed_at: timestamp("changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const profileSectionVisibility = pgTable("profile_section_visibility", {
  id: id(),
  user_id: uuid("user_id").notNull().unique(),
  calendar_visibility: text("calendar_visibility").notNull().default("public"),
  posts_visibility: text("posts_visibility").notNull().default("public"),
  wellness_visibility: text("wellness_visibility").notNull().default("public"),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export const calendarEvents = pgTable("calendar_events", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  starts_at: timestamp("starts_at", { withTimezone: true }).notNull(),
  ends_at: timestamp("ends_at", { withTimezone: true }).notNull(),
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  connection_id: uuid("connection_id"),
  external_id: text("external_id"),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const scheduleBlocks = pgTable("schedule_blocks", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  activity_type_id: uuid("activity_type_id"),
  title: text("title").notNull(),
  start_at: timestamp("start_at", { withTimezone: true }).notNull(),
  end_at: timestamp("end_at", { withTimezone: true }).notNull(),
  note: text("note"),
  tags: text("tags").array(),
  visibility: text("visibility").default("private"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Capture / entries / posts / feed
// ---------------------------------------------------------------------------

export const entries = pgTable("entries", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  category_id: uuid("category_id"),
  caption: text("caption"),
  location: text("location"),
  mood: integer("mood"),
  occurred_at: timestamp("occurred_at", { withTimezone: true }),
  photo_url: text("photo_url"),
  tags: text("tags").array(),
  visibility: text("visibility").default("private"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const posts = pgTable("posts", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  image_url: text("image_url"),
  caption: text("caption"),
  activity_tag: text("activity_tag"),
  location: text("location"),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const postLikes = pgTable(
  "post_likes",
  {
    id: id(),
    user_id: uuid("user_id").notNull(),
    post_id: uuid("post_id").notNull(),
    created_at: createdAt(),
  },
  (t) => ({
    uniqUserPost: unique().on(t.user_id, t.post_id),
  }),
);

export const reactions = pgTable("reactions", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  entry_id: uuid("entry_id").notNull(),
  type: text("type").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const notes = pgTable("notes", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  title: text("title"),
  content: text("content").notNull().default(""),
  items: jsonb("items").notNull().default([]),
  kind: text("kind").notNull().default("note"),
  linked_date: date("linked_date"),
  pinned: boolean("pinned").notNull().default(false),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const notifications = pgTable("notifications", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  actor_id: uuid("actor_id").notNull(),
  type: text("type").notNull(),
  message: text("message"),
  reference_id: uuid("reference_id"),
  is_read: boolean("is_read").notNull().default(false),
  created_at: createdAt(),
});

export const feedSettings = pgTable("feed_settings", {
  id: id(),
  user_id: uuid("user_id").notNull().unique(),
  allow_extensions: boolean("allow_extensions").notNull().default(false),
  daily_feed_minutes: integer("daily_feed_minutes"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Explorer
// ---------------------------------------------------------------------------

export const exploreItems = pgTable("explore_items", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  source: text("source").notNull().default("web"),
  url: text("url").notNull().unique(),
  duration_min: integer("duration_min"),
  category: text("category").notNull(),
  tags: text("tags").array().notNull().default([]),
  language: text("language"),
  creator: text("creator"),
  thumbnail: text("thumbnail"),
  is_verified: boolean("is_verified").notNull().default(false),
  popularity_score: real("popularity_score").notNull().default(0.4),
  created_at: createdAt(),
});

export const userExplorePreferences = pgTable("user_explore_preferences", {
  id: id(),
  user_id: uuid("user_id").notNull().unique(),
  language: text("language"),
  // Off by default: the Explorer strictly serves content in the app's UI
  // language unless the user opts in to widening the pool.
  include_other_languages: boolean("include_other_languages")
    .notNull()
    .default(false),
  goals: text("goals").array().notNull().default([]),
  preferred_tags: text("preferred_tags").array().notNull().default([]),
  // Preferred content length in minutes (null = no preference).
  preferred_duration_min: integer("preferred_duration_min"),
  blocked_creators: text("blocked_creators").array().notNull().default([]),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const userItemEvents = pgTable("user_item_events", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  item_id: uuid("item_id").notNull(),
  event: text("event").notNull(),
  created_at: createdAt(),
});

// ---------------------------------------------------------------------------
// Time / focus / health
// ---------------------------------------------------------------------------

export const timeUsage = pgTable("time_usage", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  date: date("date").notNull(),
  module: text("module").notNull(),
  seconds_used: integer("seconds_used").default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const timeGoals = pgTable("time_goals", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  module: text("module"),
  daily_minutes: integer("daily_minutes").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const healthDaily = pgTable("health_daily", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  date: date("date").notNull(),
  steps: integer("steps"),
  workout_minutes: integer("workout_minutes"),
  sleep_minutes: integer("sleep_minutes"),
  active_calories: integer("active_calories"),
  distance_km: real("distance_km"),
  resistance_proxy: real("resistance_proxy"),
  resistance_volume: real("resistance_volume"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const goalsHealth = pgTable("goals_health", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  metric: text("metric").notNull(),
  period: text("period").notNull(),
  target: real("target").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const workoutSessions = pgTable("workout_sessions", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  type: text("type"),
  minutes: integer("minutes"),
  rpe: integer("rpe"),
  notes: text("notes"),
  started_at: timestamp("started_at", { withTimezone: true }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const deviceConnections = pgTable("device_connections", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  provider: text("provider").notNull(),
  access_token: text("access_token"),
  refresh_token: text("refresh_token"),
  scopes: text("scopes").array(),
  connected_at: timestamp("connected_at", { withTimezone: true }).defaultNow(),
  last_sync_at: timestamp("last_sync_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Categories / activity types
// ---------------------------------------------------------------------------

export const categories = pgTable("categories", {
  id: id(),
  name: text("name").notNull(),
  icon: text("icon"),
  is_default: boolean("is_default").default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const activityTypes = pgTable("activity_types", {
  id: id(),
  user_id: uuid("user_id"),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),
  is_default: boolean("is_default").default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// AI memory / audit
// ---------------------------------------------------------------------------

export const aiMemories = pgTable("ai_memories", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  content: text("content").notNull(),
  memory_type: text("memory_type").notNull().default("preference"),
  importance_score: real("importance_score").notNull().default(0.5),
  last_accessed_at: timestamp("last_accessed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const aiCalendarAudit = pgTable("ai_calendar_audit", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  action: text("action").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  event_id: uuid("event_id"),
  prompt: text("prompt"),
  created_at: createdAt(),
});

// ---------------------------------------------------------------------------
// Social plans (friend availability -> make a plan)
// ---------------------------------------------------------------------------

export const socialPlans = pgTable("social_plans", {
  id: id(),
  creator_id: uuid("creator_id").notNull(),
  title: text("title").notNull(),
  plan_date: date("plan_date").notNull(),
  start_minute: integer("start_minute").notNull(),
  end_minute: integer("end_minute").notNull(),
  note: text("note"),
  status: text("status").notNull().default("proposed"),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const socialPlanInvites = pgTable("social_plan_invites", {
  id: id(),
  plan_id: uuid("plan_id").notNull(),
  invitee_id: uuid("invitee_id").notNull(),
  status: text("status").notNull().default("pending"),
  responded_at: timestamp("responded_at", { withTimezone: true }),
  created_at: createdAt(),
});

// ---------------------------------------------------------------------------
// Registry: maps the PostgREST table name -> Drizzle table for the DB shim.
// ---------------------------------------------------------------------------

export const mediaConsent = pgTable("media_consent", {
  id: id(),
  user_id: uuid("user_id").notNull().unique(),
  share_media_preferences: boolean("share_media_preferences")
    .notNull()
    .default(false),
  share_health_data: boolean("share_health_data").notNull().default(false),
  share_calendar_patterns: boolean("share_calendar_patterns")
    .notNull()
    .default(false),
  consent_given_at: timestamp("consent_given_at", { withTimezone: true }),
  consent_version: text("consent_version").notNull().default("1"),
  healthy_verified_mode: boolean("healthy_verified_mode")
    .notNull()
    .default(true),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const mediaIntegrations = pgTable(
  "media_integrations",
  {
    id: id(),
    user_id: uuid("user_id").notNull(),
    provider: text("provider").notNull(),
    access_token: text("access_token").notNull().default(""),
    refresh_token: text("refresh_token"),
    is_active: boolean("is_active").notNull().default(true),
    scopes: jsonb("scopes").notNull().default([]),
    connected_at: timestamp("connected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    last_sync_at: timestamp("last_sync_at", { withTimezone: true }),
    last_sync_status: text("last_sync_status"),
    last_sync_error: text("last_sync_error"),
    token_expires_at: timestamp("token_expires_at", { withTimezone: true }),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [unique().on(t.user_id, t.provider)],
);

export const recommendationFeedback = pgTable(
  "recommendation_feedback",
  {
    id: id(),
    user_id: uuid("user_id").notNull(),
    item_id: text("item_id").notNull(),
    provider: text("provider").notNull().default("vyv"),
    action: text("action").notNull(),
    context_tag: text("context_tag"),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [unique().on(t.user_id, t.item_id, t.provider)],
);

export const seenItems = pgTable(
  "seen_items",
  {
    id: id(),
    user_id: uuid("user_id").notNull(),
    item_id: text("item_id").notNull(),
    provider: text("provider").notNull().default("vyv"),
    seen_at: timestamp("seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.user_id, t.item_id, t.provider)],
);

// ---------------------------------------------------------------------------
// Explorer: saved items & open/continue tracking
// ---------------------------------------------------------------------------

// Persistent saved ("bookmarked") content. Metadata is denormalized so a
// saved item survives even if the catalogue row churns. provider_item_id is
// the explore_items uuid for provider "vyv", or the content URL for external
// (AI/elevate) cards without a stable catalogue id.
export const explorerSavedItems = pgTable(
  "explorer_saved_items",
  {
    id: id(),
    user_id: uuid("user_id").notNull(),
    provider: text("provider").notNull().default("vyv"),
    provider_item_id: text("provider_item_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    url: text("url"),
    category: text("category"),
    language: text("language"),
    duration_min: integer("duration_min"),
    thumbnail: text("thumbnail"),
    creator: text("creator"),
    saved_at: timestamp("saved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.user_id, t.provider, t.provider_item_id)],
);

// Open/continue tracking. Content plays in external apps, so exact playback
// progress cannot be tracked: we record opens (last_opened_at) and an honest
// user-driven completed_at. "Continue" = opened, not completed.
export const explorerProgress = pgTable(
  "explorer_progress",
  {
    id: id(),
    user_id: uuid("user_id").notNull(),
    provider: text("provider").notNull().default("vyv"),
    provider_item_id: text("provider_item_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    url: text("url"),
    category: text("category"),
    language: text("language"),
    duration_min: integer("duration_min"),
    thumbnail: text("thumbnail"),
    creator: text("creator"),
    first_opened_at: timestamp("first_opened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    last_opened_at: timestamp("last_opened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completed_at: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [unique().on(t.user_id, t.provider, t.provider_item_id)],
);

export const vyvTables = {
  profiles,
  media_consent: mediaConsent,
  follows,
  follow_requests: followRequests,
  handle_changes: handleChanges,
  profile_section_visibility: profileSectionVisibility,
  calendar_events: calendarEvents,
  schedule_blocks: scheduleBlocks,
  entries,
  posts,
  post_likes: postLikes,
  reactions,
  notes,
  notifications,
  feed_settings: feedSettings,
  explore_items: exploreItems,
  user_explore_preferences: userExplorePreferences,
  user_item_events: userItemEvents,
  time_usage: timeUsage,
  time_goals: timeGoals,
  health_daily: healthDaily,
  goals_health: goalsHealth,
  workout_sessions: workoutSessions,
  device_connections: deviceConnections,
  categories,
  activity_types: activityTypes,
  ai_memories: aiMemories,
  ai_calendar_audit: aiCalendarAudit,
  social_plans: socialPlans,
  social_plan_invites: socialPlanInvites,
  media_integrations: mediaIntegrations,
  recommendation_feedback: recommendationFeedback,
  seen_items: seenItems,
  explorer_saved_items: explorerSavedItems,
  explorer_progress: explorerProgress,
} as const;

export type VyvTableName = keyof typeof vyvTables;

// ---------------------------------------------------------------------------
// Server-only tables (NOT in the vyvTables client allowlist)
// ---------------------------------------------------------------------------

// Web Push subscriptions — managed exclusively through /api/push/* routes.
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: id(),
  user_id: uuid("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  created_at: createdAt(),
});

// App-level key/value config (e.g. VAPID keys; sensitive values encrypted).
export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updated_at: updatedAt(),
});

// Tracks which calendar events already got a push reminder (dedupe).
export const calendarRemindersSent = pgTable("calendar_reminders_sent", {
  event_id: uuid("event_id").primaryKey(),
  user_id: uuid("user_id").notNull(),
  sent_at: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});
