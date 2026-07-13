---
name: api-server test bundling
description: Why the api-server test script needs workspace-lib aliases and their transitive deps as devDeps
---

The api-server test script bundles tests with esbuild using `--packages=external`.

**Rule:** any workspace lib imported (directly or transitively) by code under test must get an `--alias:@workspace/<lib>=../../lib/<lib>/src/index.ts` entry, AND that lib's own npm dependencies must be devDependencies of api-server.

**Why:** with `--packages=external`, an un-aliased workspace lib resolves to its `src/index.ts` with extensionless ESM imports (Node rejects them), and an aliased lib gets inlined but its deps (e.g. `p-limit`, `p-retry` from the gemini lib) stay external — Node then resolves them from api-server's node_modules, where pnpm does not hoist them.

**How to apply:** if a new test imports a router that pulls in another workspace lib and fails with `ERR_MODULE_NOT_FOUND`, add the alias and install the lib's deps as api-server devDeps. Same pattern as the `@google/genai` externalization gotcha in replit.md.

**Test-only auth:** mount the router behind middleware that sets `req.authUser` from an `x-test-user` header — `requireUser` only checks `req.authUser`.
