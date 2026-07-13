---
name: Explore catalogue test seeding
description: Gotchas when integration tests seed explore_items against the shared dev DB
---

# Explore catalogue test seeding

The Explorer endpoints read only the newest N catalogue rows (a windowed
`ORDER BY created_at DESC LIMIT N` query). Tests that seed `explore_items`
share this window with the live catalogue and with each other.

**Rules:**
- Seeding new rows pushes older live rows out of the window. A test whose
  eligible pool sits near a threshold (e.g. the refresh guard's "keep at
  least pageSize/4 fresh alternatives") can be broken by *another* test
  file adding a handful of seeds. Seed pools comfortably above
  `pageSize + guard threshold`, never at the edge.
- `language: null` items pass **every** language filter. A test-exclusive
  language (e.g. "zz") gives a controlled pool only if you also account
  for null-language rows — including ones seeded concurrently by other
  test files (node --test runs files in parallel processes).
- For "pool is exhausted" assertions, compute the eligible pool by
  mirroring the route's own windowed query at test time, and validate
  returned ids against the union of a pre-call and post-call snapshot to
  stay race-free against concurrent seed/cleanup.
- `exclude_ids` is capped at 100 server-side; an exhaustion test must
  assert its eligible pool fits under that cap or the exclusion silently
  stops covering the pool.

**Why:** a passing-in-isolation test failed only when run alongside a new
test that added 5 rows, because those rows evicted the last few live
Yoga/es items from the newest-200 window.
