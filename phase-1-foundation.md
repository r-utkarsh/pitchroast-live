# PHASE 1: Foundation, server and Nexconn discovery

Goal: a buildable project skeleton, a working local API server, and a written record of how the Nexconn SDK works. The token flow is verified against the real Nexconn service when keys exist.

Rules from AGENTS.md apply. Do not ask anything. Do not start phase 2.

## Tasks
1. Create PROGRESS.md (if missing), DECISIONS.md and STATUS.md.
2. Create the project skeleton in the project root: package.json (scripts from SPEC section 2), tsconfig with strict mode, vite.config.ts (with the env define from SPEC section 3 and a /api proxy to port 8787), Tailwind and PostCSS config, index.html, src/main.tsx with a placeholder App that renders the app name, vercel.json with the SPA rewrite, .gitignore (node_modules, dist, .env, .env.local, test-results, playwright-report, *.log), .env.example, playwright.config.ts (Chromium only, with a webServer entry that starts "npm run dev"), vitest config.
3. Install dependencies non-interactively. Pin exact versions. Check that "npm run typecheck" and "npm run build" work on the placeholder app.
4. Write scripts/check-no-secret.mjs as described in SPEC section 3 and wire it into "npm run verify".
5. Nexconn discovery (SPEC section 4). Install the web client package and the server SDK or work out the server REST API. Write the "Nexconn facts" section in DECISIONS.md. Pick the channel type (A, B or C) and log why.
6. Build the server: server/handlers/token.ts (plus join.ts if your channel type needs it), shared helpers (input validation, in-memory rate limiter, error responses, safe env reading), server/dev.ts (Express, port 8787, mounts the same handlers), and thin wrappers api/token.ts (plus api/join.ts). Handlers must follow SPEC section 5 (validation, methods, body size, rate limit, safe errors).
7. Make "npm run dev" start Vite and the local API together (concurrently or similar). Start it in the background, call POST /api/token with a test user using curl, and check the response shape. Never print the secret or the .env file. Stop the servers afterwards.
8. If keys exist, the token call must succeed against the real Nexconn service. If it fails, fix the cause (region, base URL, signature, ID format) using the blocker ladder. If keys are missing, note "live token check PENDING" in STATUS.md.

## Exit gate
- npm install, npm run typecheck and npm run build succeed.
- npm run dev starts both servers, and POST /api/token returns a valid JSON response (a real token if keys exist). Invalid input returns a 400 with {error}, and a GET returns 405.
- DECISIONS.md contains the complete "Nexconn facts" section and the chosen channel type.
- Secret check script exists and passes.
- No process is left running.

## Finish
Mark PHASE 1: DONE in PROGRESS.md, overwrite HANDOFF.md (what exists, working commands, Nexconn gotchas, what phase 2 starts with), print "PHASE 1 COMPLETE", and stop.
