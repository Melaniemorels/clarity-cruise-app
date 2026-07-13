// Phase-2 feature flags.
//
// HEALTH_PHASE2_ENABLED gates everything related to health-app / wearable
// integrations (Apple Health, Google Fit, watches) and the "Today's activity"
// widgets (steps, workout, sleep). A real HealthKit connection needs a native
// iOS app, so this whole surface is parked for Phase 2. Flip to true to bring
// it all back — nothing was deleted.
export const HEALTH_PHASE2_ENABLED = false;
