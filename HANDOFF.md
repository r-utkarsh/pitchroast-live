# Handoff

Phase 1 complete. Next session runs phase 2 only.

## Done
- Project skeleton: package.json (all SPEC scripts), strict tsconfig, vite.config.ts with App Key define and /api proxy to 8787, tailwind + postcss config, index.html with title/description/favicon, vercel.json SPA rewrite, .gitignore, .env.example, Playwright (Chromium, webServer) and Vitest configs.
- Placeholder React app that renders PitchRoast Live, Tailwind dark tokens (ink/accent/tag colors) in tailwind.config.cjs.
- scripts/check-no-secret.mjs wired into npm run verify.
- server/env.ts (env loading, region -> API base URLs, NEXCONN_API_BASE_URL override), server/http.ts (POST-only, 2 KB body, 20/min in-memory rate limit, safe error shape), server/validation.ts, server/nexconn.ts (SHA1 signing, primary/backup domains, token issue, create+join group), server/handlers/token.ts, server/handlers/join.ts, api/token.ts, api/join.ts, server/dev.ts.
- Live verified: real token issuance and group create/join/rejoin. See STATUS.md.
- scripts/live-check.mjs: reusable local API smoke test (13 checks, prints no tokens).

## Not done
- No client SDK code yet (src/lib/chat.ts, protocol, reducer, digest, session) - that is phase 2.
- No real routes or UI yet.
- No README yet (phase 5).
- No seed-demo endpoint yet (optional, evaluated in phase 2).

## Commands that work
- npm run dev -> Vite http://localhost:5173 + API http://localhost:8787 (background it and stop it after use).
- npm run typecheck, npm run test, npm run build, npm run check-secret, npm run verify.
- node scripts/live-check.mjs while npm run dev is up (safe output).
- npm run test:e2e currently has no tests; Playwright is installed but browsers may need `npx playwright install chromium` (not yet run).

## Gotchas
- .env holds the real Singapore keys. Never cat it or print values. Server reads NEXCONN_APP_KEY/SECRET/REGION; Vite injects only the App Key.
- Nexconn Singapore server API: https://api.sg-light-api.com, signature = SHA1(secret + nonce + timestamp), headers App-Key/Nonce/Timestamp/Signature. Timestamp is milliseconds.
- Group create auto-adds the creator as owner; join is safe to repeat. Keep the create-then-join order.
- channelIdFor maps "-" to "_" (demo rooms): room demo-abcdefghij -> channel pr_demo_abcdefghij.
- Node 24.16.0, npm 11.17.0. Vite 8 / TS 7 / Vitest 5 are the pinned current versions.
- npm's allow-scripts warning about esbuild is harmless here; builds work.
- Ports must be free before npm run dev: check 5173/8787 and stop leftover node processes with Get-NetTCPConnection.
- Do not import anything from server/ or api/ into src/; that would risk the secret and break the browser build.

## Next phase starts with
Phase 2: create src/lib/validation.ts, protocol.ts, reducer.ts, digest.ts, session.ts and chat.ts (the only file allowed to import @nexconn/chat), unit-test all pure modules, then prove the adapter with /__smoke and a two-context Playwright test against a fresh smoke_ room.
