# VYV — Visualize Your Vibe

A social wellness app for planning your day intentionally: a calendar, an AI "perfect day" planner that writes events into your calendar, friend availability with overlapping free-time discovery, and a content Explorer. Imported from a Lovable.dev / Supabase project and migrated onto the Replit pnpm-workspace stack.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (binds to `PORT`, dev proxy → `/api`)
- `pnpm --filter @workspace/vyv run dev` — run the VYV web frontend (Vite)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run check-drift` — fail loudly if the Drizzle schema and the live DB disagree (registered as the `schema-drift` validation)
- Required env: `DATABASE_URL` — Postgres connection string
- Object storage env: `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`
- Auth env: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` (server), `VITE_CLERK_PUBLISHABLE_KEY` (frontend) — Replit-managed Clerk
- AI: uses the Replit Gemini integration proxy (no external key needed)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite (imported Lovable app, shadcn/ui + Tailwind)
- Auth: Replit-managed Clerk (`@clerk/express` server, `@clerk/react` frontend)
- AI: Replit Gemini integration (`@workspace/integrations-gemini-ai`)
- Storage: Replit object storage (`@google-cloud/storage`)

## Where things live

- `artifacts/vyv/` — the React frontend (the imported Lovable app)
- `artifacts/vyv/src/integrations/supabase/client.ts` — **Supabase compatibility shim**: exposes the Supabase client API (`.from`, `.auth`, `.storage`, `.functions`, realtime no-op) but routes everything to the Express API. This is why the ~40 files that call `supabase.*` did not need rewriting.
- `artifacts/api-server/src/routes/` — backend routes:
  - `auth.ts` — Clerk-backed identity: `GET /auth/user` returns the bridged internal-user record (Supabase-shaped), plus a no-op `/auth/signout` (Clerk owns sessions)
  - `db.ts` — generic query executor backing `.from(table)` (table allowlist, parameterized SQL)
  - `functions.ts` — edge-function equivalents (`generate-perfect-day`, `explore-feed`, stubs)
  - `storage.ts` — object-storage upload/serve/remove
- `lib/db/src/schema/vyv.ts` — Drizzle table definitions + `vyvTables` allowlist registry (source of truth for DB schema)

## Architecture decisions

- **Supabase compatibility shim over rewrite.** Rather than porting every `supabase.*` call, the client module was replaced with a shim mapping to the Express API. Keeps the imported app's screens/markup/features intact. Unknown tables fail soft (return `[]`) so secondary pages don't crash.
- **Auth is Replit-managed Clerk.** The original Supabase auth (and the interim custom email+password scrypt+JWT) were replaced with Clerk: real Google SSO, email/password with verification, and password reset via Clerk's hosted `<SignIn>`/`<SignUp>`. A JIT bridge maps each Clerk user id to a single stable internal UUID (`app_users.clerk_user_id` unique; linked by email on first sight), so all imported per-user queries keep working unchanged and existing data is preserved. Transport is cookie/session only — no `Authorization: Bearer` headers (a stray Bearer makes Clerk's `getAuth` reject an otherwise-valid cookie). See `.agents/memory/vyv-clerk-auth.md`. Spanish localization is supported via `@clerk/localizations`.
- **Web push notifications are live.** Server: `artifacts/api-server/src/lib/webPush.ts` (VAPID keys auto-generated and persisted encrypted in `app_config`; `sendNotificationPush` mirrors every `notifications` insert as push with es/en copy; `runReminderSweep` every 60s pushes calendar reminders 15 min before events, claim-first dedupe in `calendar_reminders_sent`) + `routes/push.ts` (subscribe/unsubscribe/vapid-public-key, behind auth). Server-only tables `push_subscriptions`/`app_config`/`calendar_reminders_sent` are NOT in the `vyvTables` allowlist. Frontend: `public/sw.js` (base-path-aware via registration scope), `hooks/use-push-notifications.ts`, toggle in SettingsDialog, silent resync on login in `App.tsx`. Cross-user `notifications` inserts are relationship-gated in `db.ts` (`assertNotificationInsertAllowed`): follow edge or plan invite required, so users can't push-spam strangers.
- **Write-side authorization instead of full RLS.** The original relied on Postgres row-level security. `/api/db/query` enforces ownership on every mutation: tables with `user_id` are forced/scoped to the caller; tables with other owner semantics use per-table rules (`OWNER_RULES` in `db.ts`: follows → follower/following, follow_requests → requester/target, social_plans → creator, social_plan_invites → creator-inserts + invitee-responds); global reference tables (`explore_items`, `categories`, `activity_types`) are client-read-only; owner columns are stripped from update/upsert payloads and upsert conflict-updates carry an ownership `setWhere`. Covered by `artifacts/api-server/src/test/privacy-scope.test.ts` (`pnpm --filter @workspace/api-server run test`). Reads remain open across allowlisted tables (outside `PRIVATE_READ_TABLES`) because Phase-1 features legitimately read other users' rows — this read-side openness is an accepted beta limitation.
- **Account management is real, not decorative.** Change email/password open Clerk's account panel (`openUserProfile()`). `POST /api/auth/delete-account` purges all the user's rows across every app table in one transaction (including invites on plans they created), deletes the `app_users` bridge row, then deletes the Clerk user (DB first so a failed purge never locks the user out with data left behind). `POST /api/auth/signout-all` revokes every active Clerk session and fails loudly if any revocation fails; the client only shows success on 200. Remaining "Próximamente" items (help/FAQ, contact support, feedback, community guidelines) are intentionally stubs for the MVP.
- **AI via Replit Gemini proxy.** The Lovable AI gateway calls were replaced with the Replit Gemini integration (no external key).
- **AI memories + calendar audit are wired.** `vyv-assistant` injects the user's top `ai_memories` into the system prompt (only when `profiles.ai_memory_enabled` is true) and fire-and-forget extracts up to 2 new durable facts per exchange (deduped, 60/user cap). `vyv-calendar-action` writes `ai_calendar_audit` rows (before/after snapshots + prompt) on every create/update/delete, best-effort so audit failures never break the action.
- **Explorer catalogue never depends on a single user.** `explore_items` is a global catalogue. It fills from: (1) the requesting user's own YouTube/Spotify connection, (2) any active connection (public searches only — never other users' likes/saved shows), or (3) an app-level Spotify client-credentials sync (no user connection needed; `market` param required, episode-search `limit` capped at 8). All paths are throttled to 12h and triggered fire-and-forget from `explore-feed`.
- **Explorer is feature-flagged OFF (simplified MVP).** Frontend: `EXPLORER_ENABLED = false` in `artifacts/vyv/src/lib/feature-flags.ts` hides the Explorer tab (nav becomes Home / Calendar / Capture / Friends / Profile), redirects `/explore/*`, `/recommendations`, `/media-connections` → home and `/perfect-day` → `/calendar`, filters Explorer tour/onboarding steps, and hides Home contextual recs, the Settings media-connections link, and the Calendar explore screen-time rows. Backend: env var `EXPLORER_ENABLED` (currently `"false"`, shared) gates catalogue syncs in `explore-feed`/`contextual-recommendations` and returns 403/redirect-error on `/media/{youtube,spotify}/{connect,sync,callback}` (`artifacts/api-server/src/lib/featureFlags.ts`). Nothing deleted — re-enable by flipping the frontend const to `true` and setting the env var to `"true"`.
- **Catalogue is bilingual (es + en).** Sync query sets exist per language (YouTube `CATEGORY_SEARCH_QUERIES[_EN]`, Spotify `EPISODE_SEARCH_QUERIES[_EN]`), items are tagged with `explore_items.language`, and `explore-feed` / `contextual-recommendations` filter to the app's UI language (sent by the frontend; unknown-language items pass; falls back to the full pool if the slice is too thin). The UI language also overrides `user_preferences.language` for ranking.

## Product

Phase-1 MVP (the features made to work):
1. **Calendar** — view/manage scheduled events and blocks.
2. **AI day planner** — generates a "perfect day" via Gemini and writes it into the calendar.
3. **Friend availability** — see friends' availability and find overlapping free time.
4. **Explorer** — ranked content discovery feed. *Currently hidden behind the `EXPLORER_ENABLED` feature flag (off) as part of the MVP simplification.*

Capture / Feed / Likes exist but are kept simple and secondary. DMs, comments, health/watch integrations, points/streaks, and monetization are intentionally not migrated.

## User preferences

- Phase-1 MVP only; do not over-build (project billed at import-free rate).
- Preserve the imported codebase and DB; do not delete files.
- Keep Capture/Feed/Likes minimal; do not expand out-of-scope features.

## Gotchas

- The API server binds to `PORT` (assigned per artifact — e.g. 8080), not a hardcoded port. Health check is at `/api/healthz` (not `/api/health`).
- Build libs before typechecking the api-server if you change `lib/db` or the gemini lib: `pnpm exec tsc -b lib/db lib/integrations-gemini-ai` (stale `dist` declarations otherwise).
- `@google/*` packages are externalized by the api-server build, so `@google/genai` must be a direct dependency of `@workspace/api-server`.
- Express 5 uses path-to-regexp v8: wildcard routes use `*splat` named params (e.g. `/storage/:bucket/serve/*splat`, read via `req.params.splat`).
- The frontend typecheck has pre-existing/shim-loose-typing errors, but the Vite (esbuild) build ignores typecheck, so runtime is unaffected.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- `.agents/memory/vyv-migration.md` — detailed migration architecture notes
