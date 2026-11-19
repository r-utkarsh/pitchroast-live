# Status

Updated: phase 1, 2026-11-19.

## Verified live (real Nexconn Singapore app, .env keys present)
- POST /api/token returns HTTP 200 with a real 96-char access token for two different test users (never printed).
- POST /api/join creates a group channel (pr_ + roomId) and adds a second reviewer; re-joining the same group succeeds.
- Local API behavior: invalid userId/name -> 400 {error}; GET -> 405 with Allow: POST; invalid JSON -> 400; 3 KB body -> 413; 2 KB limit enforced.
- npm install, npm run typecheck, npm run test (3 tests), npm run build and npm run check-secret all pass.
- npm run dev starts Vite on 5173 and the API on 8787; both were stopped afterwards and the ports are free.
- check-no-secret scanned 4 built files and did not find the App Secret.

## PENDING
- Client-side SDK connect/send/receive/history against Nexconn (phase 2 smoke test).
- Everything UI related (phase 3).
- Security audit and npm audit --omit=dev (phase 4/5).

## KNOWN LIMITATIONS
- Rate limiting is in-memory per server instance; best-effort on serverless (will be noted in the README).
- Group creation is attempted on every join, so an existing room costs one failed create + one successful join. Acceptable; keeps the flow idempotent without a second lookup API.
- The first reviewer to enter an empty room becomes the group owner. The app never exposes owner-only actions.
- The live tests created real users (u_... per SPEC) and groups (pr_...) in the Nexconn app. Test rooms are prefixed pr_ and are safe to leave.
- npm printed an allow-scripts warning for esbuild's postinstall during install; Vite build works anyway. No permission settings were changed.

## Security notes
- App Secret exists only in .env and server runtime. No server module is imported by src/. check-no-secret passes.
- No CORS headers, no analytics, no external fonts or CDNs.
