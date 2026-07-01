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

## AI
- Edge functions originally used Lovable AI gateway (`LOVABLE_API_KEY`, model google/gemini-3-flash-preview). Replaced with Replit Gemini integration (ai-integrations-gemini skill, proxy, no external key).

## RLS note / write authorization
- Original relied on Postgres RLS. The generic `/api/db/query` executor can't reproduce full per-row RLS, but it enforces **write-side ownership**: any table with a `user_id` column has inserts/upserts forced to `user_id = authUser.id` and update/delete auto-scoped to the caller's own rows; update/delete on tables lacking a scope (no `user_id` col and no filter) are rejected 400 to prevent table-wide wipes.
- **Reads remain open** (any authed user can read allowlisted tables) because Phase-1 features — friend availability/overlap, public profiles, explorer — legitimately read other users' rows. This read-side gap is the accepted beta limitation, NOT a per-row-secured production posture.
- **Why:** reproducing exact RLS per-table would break the cross-user reads the user asked to make WORK; write scoping closes the severe IDOR/mass-wipe risk cheaply without breaking features.
