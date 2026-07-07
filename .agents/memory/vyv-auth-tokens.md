---
name: VYV frontend auth-token pattern
description: How frontend code must obtain API bearer tokens after the Clerk migration; the AuthContext session carries no token by design.
---

# VYV auth-token pattern (post-Clerk migration)

- **Rule:** Frontend code must fetch a fresh token per request via the Supabase shim (`supabase.auth.getSession()`), never use `useAuth().session.access_token`.
- **Why:** `AuthContext` exposes a Supabase-shaped session with `access_token: ""` (empty) on purpose — Clerk tokens expire in ~60s so a static token in React state would go stale. Hooks that read the context token either always threw "Not authenticated" (falsy check) or sent an empty bearer and silently relied on the Clerk cookie (transient 401s).
- **How to apply:** Use `useAuth().session` only as an "is logged in" gate (`enabled: !!session`); inside any queryFn/mutationFn, get the fresh token from the shim. AI-cost endpoints must use `requireUser` server-side; never accept the Supabase publishable key as a bearer.
