# SEO Strategy

## In scope
- Public marketing/entry page: `/welcome`
- Public user profile route: `/u/:username`
- Public legal pages: `/privacy-policy`, `/terms-of-use`
- Shared HTML shell and crawlability files for the public web app

## Out of scope
- Authenticated application routes behind `ProtectedRoute`
- Onboarding and settings routes that require sign-in
- API endpoints except where they affect crawlability files or frontend delivery

## Target audience
- Prospective VYV users evaluating the product
- People landing on shared public profile URLs
- Search and AI crawlers discovering the app's public surface

## Primary keywords
- Unknown — update once product positioning is finalized.

## Dismissed categories
- None yet.

## Notes
- Frontend is a Vite + React SPA with a single shared `index.html` head.
- Public-route SEO depends on what is present in the initial HTML response, especially for social bots and AI crawlers.
