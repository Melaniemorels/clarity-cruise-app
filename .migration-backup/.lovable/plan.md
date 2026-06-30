# VYV — Final Stability Audit Before Capacitor / Xcode

Goal: audit the existing app, fix what is broken, disconnected, or fragile, and prepare the codebase for a clean Capacitor + Xcode export. No UI rebuilds, no new sections.

This is an audit + fix pass, not a feature build. I will only touch files that need fixes.

---

## Phase 1 — Read-only audit (no code changes)

I will read and verify the current state of these systems and produce a written report:

1. **Auth & profile creation**
   - `AuthContext`, `Auth.tsx`, `AuthCallback.tsx`, `SocialSignInButton`, `handle_new_user` trigger
   - Verify Google/Apple use `lovable.auth.signInWithOAuth` (managed OAuth), not raw Supabase
   - Verify profile + feed_settings + time_goals + visibility rows are created for every new user (already in `handle_new_user`)
   - Verify onboarding writes to `profiles` (interests, hobbies, sports, mood, wellness goals) and never crashes on null fields

2. **Explorer external links**
   - `src/lib/open-content.ts`, `src/lib/external-link.ts`, `src/lib/browser.ts`
   - YouTube / Spotify / podcast / article / audiobook open paths
   - Confirm Capacitor-safe opening (`@capacitor/browser` when native, `window.open` on web)
   - Confirm invalid/missing URL → toast, no crash

3. **Explorer content + AI recs**
   - `explore-feed`, `generate-recommendations`, `contextual-recommendations` edge functions
   - Category / search / filter / mood / sport / hobby flow
   - AI uses user profile signals; respects "healthy, intentional, low-screen-time" framing

4. **Calendar (manual + AI)**
   - `Calendar.tsx`, `EventModal`, `EventDetailModal`, `vyv-calendar-action`
   - Add / edit / delete / move; day/week/month views
   - AI: `vyv-assistant` only PROPOSES; confirmation required; manual calendar still works if AI fails

5. **Friends, invitations, notifications**
   - `social_plans`, `social_plan_invites`, `notifications`, `NotificationCenter`
   - Invite → notify → accept/decline → notify back

6. **Push notification scaffolding**
   - Settings already exist (quiet hours, wellness nudges, etc.)
   - Confirm preferences are stored and read; document native wiring as out-of-scope for Lovable

7. **Mobile readiness**
   - `capacitor.config.ts`, safe-area usage, no hardcoded `localhost`, no exposed service-role key, no `.env` leaks
   - Run TypeScript / build (done automatically by harness)
   - Run Supabase linter for RLS/security issues

---

## Phase 2 — Fixes (only what the audit flags)

Likely fix areas (confirmed only after Phase 1):

- **Auth**
  - Ensure Apple button only renders when Apple provider is enabled (already a memory rule — verify)
  - Ensure `AuthCallback` handles error params and tokens cleanly on both web and native
  - Add defensive null-handling in profile reads

- **External links**
  - Centralize all external opens through `open-content.ts` so Capacitor swap is one place
  - On native (Capacitor), use `@capacitor/browser` `Browser.open` instead of `window.open`
  - Toast on missing/invalid URL

- **Calendar AI safety**
  - Re-verify `vyv-calendar-action` requires `ai_calendar_access_enabled` (already does)
  - Confirm proposals are parsed defensively on the client

- **Notifications**
  - Verify invite create / accept / decline writes a row to `notifications` for the other party
  - Fix any missing notification triggers found during audit

- **Capacitor config**
  - Confirm `capacitor.config.ts` has correct `appId`, `appName`, and `server.url` matches preview
  - Confirm `viewport-fit=cover` and `pb-safe` usage in shell layout

- **Security/lint**
  - Run `supabase--linter` and fix any new RLS / search_path issues introduced recently

I will NOT:
- Rebuild any UI
- Change visual design (memory: aesthetic preservation policy)
- Add new tables unless a clear bug requires it
- Touch `src/integrations/supabase/client.ts`, `types.ts`, `.env`, or `supabase/config.toml`

---

## Phase 3 — Final report

I'll deliver, in chat:

1. **What was already working**
2. **What was broken / disconnected**
3. **What I fixed** (with file list)
4. **DB / env / secret changes** (if any)
5. **What cannot be completed inside Lovable**
6. **Next Steps for Capacitor & Xcode** — a clean, ordered checklist covering:
   - `npx cap add ios` / `android`, `npx cap sync`
   - Xcode signing, bundle ID, capabilities (Sign in with Apple, Push, Background)
   - Apple Developer: Services ID, Key, Push cert/APNs key
   - Google Cloud: OAuth client (iOS + Web), consent screen, redirect URIs
   - Supabase Auth: providers, redirect URLs, email templates
   - Spotify / YouTube: app registration, redirect URIs, scopes
   - Push: APNs + FCM, Capacitor Push Notifications plugin
   - Final checklist before App Store submission

---

## Scope guardrails

- Read-heavy, edit-light. Expect a handful of small, surgical patches — not a sweeping rewrite.
- If I find something large that's broken (e.g. notifications never created on invite), I'll fix the minimal slice and call it out in the report rather than redesigning the feature.
- Anything that genuinely requires native setup (APNs, real Apple Sign In on device, Capacitor Push plugin) will be documented, not faked.

Approve this and I'll start Phase 1 immediately.
