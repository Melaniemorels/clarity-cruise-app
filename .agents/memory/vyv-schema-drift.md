---
name: Schema drift breaks auth silently
description: When Drizzle schema column names drift from the live DB, the auth middleware's swallowed error turns every request into an unexplained 401.
---

# Schema drift vs live DB — silent auth failure mode

- **Rule:** If every API request 401s despite a valid Clerk session cookie, check for Drizzle-schema-vs-live-DB column drift on `app_users` (and other auth-path tables) before theorizing about Clerk config. Verify with an information_schema column listing, not by reading the schema file.
- **Why:** The schema declared `clerk_user_id` while the live column was `clerk_id`. `attachUser` swallowed the failed query, so Clerk auth succeeded (valid userId) but the internal-user lookup threw → no `req.authUser` → blanket 401 with zero log output. Cost several e2e runs to find.
- **How to apply:** Keep a log line in the `attachUser` catch (never fully swallow). Fix drift with an in-place `ALTER TABLE ... RENAME COLUMN` (preserves data + unique index) instead of drizzle push, which may drop/recreate.
- **Guard:** A registered `schema-drift` validation (`pnpm --filter @workspace/db run check-drift`) compares the Drizzle schema against information_schema and exits 1 on any table/column/type/nullability disagreement, and also verifies every declared unique (column `.unique()`, table `unique().on(...)`, `uniqueIndex`) is backed by a live unique index in pg_index (compared by column set, not name). Run it whenever auth 401s look unexplained or after any schema change. Note: information_schema reports array udt_names with a leading underscore (`text[]` → `_text`).
- **Recurs per environment:** each isolated task environment carries its own dev-DB copy, so the same drift (e.g. `clerk_id` vs `clerk_user_id`) can resurface in a fresh environment even after being fixed elsewhere. Check and fix the local DB before debugging auth in a new environment.
- **node-postgres quirk:** `array_agg(attname)` over pg_catalog returns `name[]`, which node-postgres does NOT parse — you get the raw string `'{col1,col2}'` instead of a JS array. Cast to `::text` inside the aggregate. Symptom: every comparison silently fails because the "array" is a string.

# Renames never survive the post-merge script (recurring)

- **Rule:** A column rename fixed inside a task agent's isolated environment does NOT reach the main dev DB. The post-merge `drizzle-kit push` runs non-interactively and dies at the rename prompt ("Interactive prompts require a TTY"), silently leaving the old column name — so the same drift (e.g. `clerk_id` vs `clerk_user_id`) reappears after every merge until someone applies the `ALTER TABLE ... RENAME COLUMN` manually via psql on the main DB.
- **How to apply:** After merging any task that changed a column name, check the live column with `\d <table>` and apply the rename DDL directly. Watch post-merge logs for the TTY error — it means the push did nothing for conflicting changes.
- **Non-interactive push:** `drizzle-kit push` aborts without a TTY whenever it wants to prompt (column rename, adding a unique constraint to a populated table). Resolve by making the live DB match by hand — including renaming the constraint to drizzle's expected name (e.g. `app_users_clerk_user_id_unique`) — until push reports "Changes applied" with no prompt. This drift recurred in a fresh task environment; always diff schema vs live DB before auth-dependent e2e runs.

# Generic query surface: timestamp filters

- Client filters (gte/lte etc.) send ISO strings; drizzle date-mode timestamp params call `value.toISOString()`, so string values throw TypeError at bind time. Any generic query path must coerce string→Date for timestamp columns on the filter path, not just the insert/update values path.

# RLS-reliant imported queries

- **Rule:** Any query imported from the Supabase app that lacks an explicit owner filter was implicitly relying on RLS and will leak other users' rows once routed through the shim. Before trusting an imported read, check whether its table is server-side owner-scoped; if not, it needs an explicit `.eq('user_id', ...)`.
- **Why:** The calendar screen showed every user's events to everyone until e2e-tested with two accounts — single-user testing cannot catch this class of bug.
