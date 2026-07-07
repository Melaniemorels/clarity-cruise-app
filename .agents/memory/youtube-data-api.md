---
name: YouTube Data API ingestion quirks
description: Quota and sync-throttle lessons for pulling YouTube content into the catalogue.
---

# YouTube Data API ingestion

- **Rule:** `search.list` costs 100 quota units per call (default daily quota 10k). Any per-user sync must rotate a subset of category searches per run and throttle re-syncs (12h via `last_sync_at`), instead of searching every category every time.
- **Why:** A 10-category sync costs ~1000+ units per user per run; a handful of active users would exhaust the daily quota.
- **How to apply:** Prefer cheap endpoints first (`videos.list` for likes = 1 unit); keep `last_sync_at` updated ONLY after a successful content sync — never inside token refresh, or staleness checks get suppressed without any sync having run.
- Ingestion must be idempotent under concurrency: catalogue rows dedupe via a DB unique constraint (`explore_items.url`) + `onConflictDoNothing`, not select-then-insert alone.
