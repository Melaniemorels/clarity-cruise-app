---
name: Schema drift breaks auth silently
description: When Drizzle schema column names drift from the live DB, the auth middleware's swallowed error turns every request into an unexplained 401.
---

# Schema drift vs live DB — silent auth failure mode

- **Rule:** If every API request 401s despite a valid Clerk session cookie, check for Drizzle-schema-vs-live-DB column drift on `app_users` (and other auth-path tables) before theorizing about Clerk config. Verify with an information_schema column listing, not by reading the schema file.
- **Why:** The schema declared `clerk_user_id` while the live column was `clerk_id`. `attachUser` swallowed the failed query, so Clerk auth succeeded (valid userId) but the internal-user lookup threw → no `req.authUser` → blanket 401 with zero log output. Cost several e2e runs to find.
- **How to apply:** Keep a log line in the `attachUser` catch (never fully swallow). Fix drift with an in-place `ALTER TABLE ... RENAME COLUMN` (preserves data + unique index) instead of drizzle push, which may drop/recreate.

# Generic query surface: timestamp filters

- Client filters (gte/lte etc.) send ISO strings; drizzle date-mode timestamp params call `value.toISOString()`, so string values throw TypeError at bind time. Any generic query path must coerce string→Date for timestamp columns on the filter path, not just the insert/update values path.

# RLS-reliant imported queries

- **Rule:** Any query imported from the Supabase app that lacks an explicit owner filter was implicitly relying on RLS and will leak other users' rows once routed through the shim. Before trusting an imported read, check whether its table is server-side owner-scoped; if not, it needs an explicit `.eq('user_id', ...)`.
- **Why:** The calendar screen showed every user's events to everyone until e2e-tested with two accounts — single-user testing cannot catch this class of bug.
