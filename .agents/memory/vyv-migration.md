---
name: VYV Lovable→Replit migration
description: Architecture decisions for porting the VYV Lovable app into the Replit pnpm_workspace stack.
---

# VYV migration architecture

Large Lovable app (social wellness "VYV"): ~33 Supabase tables, 9 AI edge functions, storage, realtime, auth. User scoped Phase 1 MVP only.

## Scope (user-directed)
- Priority features to make WORK: Calendar, AI day planner (connected to calendar), Friend availability & overlapping free time, Explorer.
- Keep Capture/Feed/Likes in codebase, simple & secondary — don't expand.
- Do NOT migrate/rebuild: DMs/comments, health integrations, Apple Watch, points/streaks/gamification, advanced profiles, monetization, advanced AI.
- Preserve existing codebase + DB where possible. Do not delete files. Target: stable beta for TestFlight.

## Key architecture decision: Supabase compatibility shim
- Instead of rewriting ~40 files that call `supabase.*`, replace `src/integrations/supabase/client.ts` with a shim exposing the same API subset, backed by the new Replit Express API.
- `.from(table)` → thenable PostgREST-like query builder → `POST /api/db/query` generic executor (table allowlist, parameterized SQL, subset of operators: select/insert/update/upsert/delete, eq/neq/in/is/gte/lte/gt/lt/or/order/limit/range/single/maybeSingle/ilike/like/not/filter/match). Unknown tables return [] gracefully so secondary pages don't crash.
- `.auth.*` → email/password auth in the Express API (bcrypt + JWT). **Deviation from migration task's Clerk suggestion** — chosen to preserve the app's existing custom auth screens/UX and honor "preserve codebase / ship parity beta". Session shape mimics Supabase (access_token, user).
- `.storage.from(bucket).upload/getPublicUrl/remove` → Replit object storage via API routes. Buckets used: "images", "quick-captures".
- Edge functions: `generate-perfect-day` and `explore-feed` reimplemented as Express routes (frontend calls them via `${VITE_SUPABASE_URL}/functions/v1/<name>`, so shim rewrites base URL). Others (moderate-content etc.) graceful stub.
- **Why:** compat shim = minimal edits, preserves styles/markup/features, focuses backend effort on priority tables only.

## Capacitor deps break web dev (gotcha)
- `artifacts/vyv` is the WEB app but contains native Capacitor code (e.g. `src/lib/haptics.ts` dynamic-imports `@capacitor/haptics`). `rollupOptions.external` only silences the *production* build — Vite **dev** (import-analysis) still tries to resolve the specifier and hard-fails the whole app (white screen, ProtectedRoute error boundary, "can't log in") if the package isn't installed.
- **Fix:** keep every referenced `@capacitor/*` package installed as a direct dep of `@workspace/vyv` (browser, core, haptics, …); the `Capacitor.isNativePlatform()` guard prevents them running on web. When a mobile-app merge adds new native imports, install the matching dep or dev breaks.

## Edge-function parity (functions.ts)
- Frontend `supabase.functions.invoke(name)` → `POST /api/functions/v1/<name>`. All active names MUST have a route or the surface errors. Implemented: generate-perfect-day, explore-feed, moderate-content(stub), generate-recommendations (Home audio recs), contextual-recommendations (Home+Explorer discovery), vyv-calendar-action (AI calendar create/update/delete, user-scoped). Recs are generated fresh via Gemini (`cached:false`); no cache table.
- When adding a new `functions.invoke` call in the frontend, add the matching Express route.

## Storage ownership (IDOR fix)
- Convention: every client storage upload path is prefixed `${user.id}/...`. The storage routes enforce that prefix on upload+remove (403 on cross-user paths); serve is intentionally public (feed images render for everyone). **Why:** the generic executor can't do per-row RLS, so path-prefix ownership is the write/delete authz. Do NOT change the `${user.id}/` prefix or you break both the authz check and existing object URLs.

## media_consent
- Not part of the original imported schema; added as a Drizzle table + `vyvTables` allowlist entry so the media-consent hooks route through the `.from()` shim (`/db/query`, write-side ownership authz) instead of dead `/rest/v1/*` calls. The shim has NO `/rest/v1/*` support — any remaining PostgREST-style `fetch` must be rewritten to `supabase.from(...)`.

## AI
- Edge functions originally used Lovable AI gateway (`LOVABLE_API_KEY`, model google/gemini-3-flash-preview). Replaced with Replit Gemini integration (ai-integrations-gemini skill, proxy, no external key).

## RLS note / authorization model (db.ts)
- Original relied on Postgres RLS. The generic `/api/db/query` executor can't reproduce full per-row RLS, but it enforces **write-side ownership**: any table with a `user_id` column has inserts/upserts forced to `user_id = authUser.id` and update/delete auto-scoped to the caller's own rows; update/delete on tables lacking a scope (no `user_id` col and no filter) are rejected 400 to prevent table-wide wipes.
- **Reads use a private/open split.** A `PRIVATE_READ_TABLES` denylist (strictly-personal tables: notes, entries, notifications, media_consent, health/*, ai_memories, prefs, etc.) force-scopes SELECTs to the owner. All other allowlisted tables keep **open reads** because Phase-1 features legitimately read cross-user: profiles/follows (social graph), calendar_events + schedule_blocks (friend availability overlap), posts/likes/reactions (feed), explore_items/categories (public content), social_plans (shared). **Why:** closes cross-user private-data leaks without breaking the Phase-1 cross-user reads. If you add a table, decide which side it belongs to.
- **Out of scope (documented, not bugs):** password recovery / `updateUser` are shim stubs (custom email+password auth deviation; no reset infra in Phase-1). Health/device-connection pages still call dead `/rest/v1/*` — those integrations are intentionally NOT migrated per replit.md. Do not build these without an explicit request (billed import-free, "do not over-build").
- **Why:** reproducing exact RLS per-table would break the cross-user reads the user asked to make WORK; write scoping closes the severe IDOR/mass-wipe risk cheaply without breaking features.
