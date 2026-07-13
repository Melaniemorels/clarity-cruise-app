// Phase-2 feature flags.
//
// HEALTH_PHASE2_ENABLED gates everything related to health-app / wearable
// integrations (Apple Health, Google Fit, watches) and the "Today's activity"
// widgets (steps, workout, sleep). A real HealthKit connection needs a native
// iOS app, so this whole surface is parked for Phase 2. Flip to true to bring
// it all back — nothing was deleted.
export const HEALTH_PHASE2_ENABLED = false;

// EXPLORER_ENABLED gates the whole Explorer surface: the Explore tab and
// routes, contextual recommendations on Home, media connections
// (Spotify/YouTube OAuth), and the Explorer steps of the guided tour.
// Nothing was deleted — flip to true to bring the Explorer back exactly as
// it was. The backend honours its own EXPLORER_ENABLED env var so no
// catalogue syncs or OAuth flows run while this is off.
export const EXPLORER_ENABLED = false;
