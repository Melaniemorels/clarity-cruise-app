---
name: VYV Clerk auth bridge
description: How VYV auth moved from custom email+password to Replit-managed Clerk while keeping the Supabase compatibility shim and per-user data isolation.
---

# VYV auth on Clerk (bridge over the Supabase shim)

VYV's auth was migrated from custom email+password (scrypt+JWT) to Replit-managed
Clerk, without rewriting the imported app's ~40 `supabase.*` call sites. The
Supabase compatibility shim stays; only its transport and the server's identity
resolution changed.

## Identity bridge: Clerk id -> stable internal UUID
- The DB keeps a single stable internal `id` (UUID) per user. `app_users` gained
  a nullable `clerk_user_id` (unique) and `password_hash` was made nullable.
- On each authenticated request the server does JIT resolution: look up the
  internal user by `clerk_user_id`; if absent, link by email (onConflictDoNothing)
  and seed a profile. This preserves existing rows and keeps all per-user data
  keyed on the same internal UUID the app already used.
- **Why:** every screen filters data by that internal UUID. Bridging Clerk -> UUID
  (instead of switching everything to the Clerk id) means zero changes to the
  imported queries and no data migration.
- **How to apply:** any new auth-touching endpoint should resolve the internal
  user via the shared middleware, never trust a client-supplied user id.

## Transport: cookies, never Bearer
- All shim/API calls use `credentials: "include"` and send NO `Authorization:
  Bearer` header. `VITE_SUPABASE_URL=/api` keeps requests same-origin so Clerk's
  session cookie is sent.
- **Why (hard-won):** a leftover/bogus `Bearer <token>` header makes Clerk's
  `getAuth` reject the request even when a valid session cookie is present. When
  auth "works in the browser UI but API calls 401", check for stray Bearer
  headers first.
- The old `access_token` guards (`if (!session?.access_token) ...`) were kept
  working by having the client set a sentinel `access_token: "clerk"` so those
  guards still pass; the value is never sent anywhere.

## Clerk provider wiring (React + Vite, Tailwind v3)
- `ClerkProvider` lives inside `BrowserRouter` and is given Clerk's router via
  `useNavigate` (stripping the artifact base path) so Clerk's `/sign-in/*` and
  `/sign-up/*` catch-all routes work under the artifact's base path.
- Appearance uses the shadcn theme. On **Tailwind v3 do NOT pass `cssLayerName`**
  to the theme (that option is for v4 `@layer`); passing it breaks styling.
- Signed-out users are routed to `/sign-in` (ProtectedRoute); signed-in users
  hitting `/sign-in` are redirected into the app.

## Social providers (Google/Apple) are Auth-pane toggles, not code
- Clerk's hosted `<SignIn>`/`<SignUp>` auto-render whichever social providers are
  enabled on the tenant. Enabling Apple (or any provider) is a user action in the
  workspace **Auth pane** — Replit-managed Clerk exposes no dashboard/API to the
  agent, so "add Apple sign-in" cannot be done from code. Once toggled on, the
  button appears with no code change.
- **How to apply:** if a task asks for a specific SSO provider, wire the hosted
  Clerk UI (provider-agnostic) and tell the user to flip the provider on in the
  Auth pane; don't hunt for a code path to enable it.

## Legacy shim credential methods fail loudly
- The old email/password server routes were removed. The Supabase shim's
  `signUp` / `signInWithPassword` / `resetPasswordForEmail` must NOT call removed
  routes or return fake success — they return an explicit error pointing to the
  Clerk sign-in page. The custom Auth/ResetPassword screens are unreachable (their
  routes redirect to `/sign-in`), but the methods still fail loudly if reached.

## Verified
- e2e (testing skill, `testClerkAuth: true`): signed-out -> /sign-in; programmatic
  Clerk sign-in lands in app; `GET /api/auth/user` returns internal UUID + email;
  signed-in visit to /sign-in redirects away.

## Bridge failure modes (hard-won)
- `attachUser` swallows ALL errors and treats them as "unauthenticated". If the
  drizzle schema and the live DB drift (e.g. a column rename not pushed), every
  request 401s app-wide and it looks like an auth/transport bug. When "valid
  Clerk session but /api/auth/user 401s", first verify the `app_users` columns
  match the drizzle schema (`clerk_user_id`), then suspect transport.
- Right after an OAuth return, Clerk reports isSignedIn before the session is
  bridgeable; AuthContext retries the /auth/user fetch (5x1s) and, if it still
  fails, calls clerk.signOut() — otherwise the router loops forever between
  ProtectedRoute (→ /sign-in) and Clerk's <SignIn> (→ /) and the browser throws
  "history.replaceState more than 100 times per 10 seconds".
- Apple sign-in needs no code: enabling it in the Auth pane (Development) uses
  Clerk shared credentials and the button auto-appears. Production/App Store
  later requires the user's own Apple Developer credentials.
