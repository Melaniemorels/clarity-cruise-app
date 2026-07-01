---
name: Clerk → app-UUID account linking
description: Safe rule for JIT-mapping a Clerk identity onto an existing app_users UUID row by email.
---

# Clerk → app-UUID JIT linking must never rebind a claimed row

When a Clerk user signs in for the first time, the app maps their opaque Clerk id
onto a stable app `app_users.id` (UUID) so per-user tables keep working. Lookup
order: (1) by `clerk_id`, (2) by email, (3) insert new.

**Rule:** only link an email-matched row to a Clerk id when that row's `clerk_id`
is NULL (unclaimed legacy row). If the row already carries a *different*
`clerk_id`, do NOT overwrite it — provision a fresh isolated row instead.

**Why:** an unconditional `update(...).set(clerkId)` on an email match lets one
Clerk principal seize another user's UUID-backed account (email reuse/change,
shared/typo'd emails), a direct cross-user data-ownership breach. Caught in code
review of the Supabase→Clerk auth migration.

**How to apply:** guard the email-link branch with `!existing.clerkId`. Treat the
`clerk_id === current` case as already-linked (no write). Log a warning on the
conflict branch. Same principle applies to any future "link by shared attribute"
provisioning.
