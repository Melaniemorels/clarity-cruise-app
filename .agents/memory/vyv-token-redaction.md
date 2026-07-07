---
name: VYV server-only secret columns
description: OAuth tokens stored in the DB must be redacted on EVERY generic client-facing query route, not just one.
---

# Server-only secret columns (OAuth tokens)

- **Rule:** Any table column holding provider secrets (e.g. `media_integrations.access_token` / `refresh_token`) must be (1) owner-scoped for reads and (2) column-redacted on *every* generic client-facing query surface. VYV has two such surfaces: the Supabase-shim REST route and the generic query executor route — each has its own `SENSITIVE_COLUMNS` map that must stay in sync.
- **Why:** During Fase A (YouTube OAuth) the tokens were redacted only in the REST route; an architect review caught that the generic query route still returned them to any authenticated user (cross-user secret leakage). Fixing one surface is not enough.
- **How to apply:** When adding a new provider (Spotify, etc.) or a new secret-bearing column, update the sensitive-column maps in both routes, add the table to the private-read set in the query executor, and keep all provider API calls server-side (frontend only ever navigates to `/api/media/<provider>/connect`).
- Prod deploy note: OAuth `redirect_uri` currently builds from `REPLIT_DEV_DOMAIN`; production needs its own registered redirect URI and a configurable origin.
