---
name: Spotify catalog sync quirks
description: Client-credentials episode search quirks and privacy rule for shared-catalogue syncs
---

# Spotify app-level (client-credentials) catalogue sync

- Client-credentials tokens work for `/v1/search` with `type=episode`, but the
  request MUST include a `market` param (e.g. `market=ES`) — without it the
  `episodes.items` array comes back full of `null`s.
- Episode search rejects `limit=16` with `400 {"message": "Invalid limit"}`;
  `limit=8` works. To get more coverage, add extra queries per category
  instead of raising the limit.
- The token endpoint + searches can transiently rate-limit right after a
  burst of ~10 searches; individual search failures are swallowed by
  per-category try/catch, so a sync returning `scanned: 0` right after a
  successful one is usually a transient 429, not a code bug. Retry later.

# Privacy rule for shared-catalogue syncs

The Explorer catalogue (`explore_items`) is global. Any sync path that runs
on behalf of a user OTHER than the requester (fallback to "any active
integration") must pass `includePersonal: false` so personal endpoints
(Spotify `me/shows`, YouTube `myRating=like`) never feed the shared feed.

**Why:** architect review flagged that user B could trigger a sync that
publishes content derived from user A's private likes/saved shows.

**How to apply:** `syncSpotifyHealthy` / `syncYouTubeHealthy` accept
`{ includePersonal }`; the `maybeSync*` callers set it to
`row.user_id === requestingUserId`. Keep this invariant for any new provider.
