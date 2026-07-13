// Server-side feature flags.
//
// The Explorer surface (explore feed, contextual recommendations, and the
// Spotify/YouTube media connections + catalogue syncs behind it) is parked
// for a later phase. It is disabled unless EXPLORER_ENABLED=true is set in
// the environment. Nothing was deleted — flipping the env var (and the
// matching frontend flag in artifacts/vyv/src/lib/feature-flags.ts) brings
// it all back.
export function explorerEnabled(): boolean {
  return process.env.EXPLORER_ENABLED === "true";
}
