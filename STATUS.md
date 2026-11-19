# Status

Updated: phase 2, 2026-11-19.

## Verified live (real Nexconn Singapore app, .env keys present)
- Phase 1: POST /api/token returns HTTP 200 with a real 96-char access token for two test users (never printed); POST /api/join creates pr_ groups and adds a second reviewer; re-joining works. Local API returns 400/405/413 correctly and enforces the 2 KB body and 20/min rate limit.
- Phase 2 unit tests: 56 tests across 7 files pass (validation, protocol, reducer, digest, session, cooldown).
- Phase 2 e2e (Chromium, three real browser contexts) passes against Nexconn: A and B connect to a fresh smoke room, A's feedback reaches B live within 5 s, and a fresh context C that joins later receives the earlier message through the sync/snapshot backfill within 15 s. `npm run test:e2e` passed in 15.2 s.
- History probe: a member sees messages sent while they were a member after a reload; a user who joined after those messages got 0 messages from SDK history across 15 retries over ~18 s. See DECISIONS.md.
- `npm run verify` (typecheck, 56 tests, production build, secret scan) passes. The bundled app key reaches dist; the App Secret does not.
- Only `src/lib/chat.ts` imports `@nexconn/*`; source grep found exactly one match.
- Ports 5173/8787 were free after the test runs; Playwright's webServer stopped.

## PENDING
- All real UI/routes (phase 3).
- README and submission artifacts (phase 5).
- Security audit, dependency audit and hardening (phase 4/5).

## KNOWN LIMITATIONS
- Nexconn group history is membership-scoped: late joiners cannot read messages sent before they joined, and there is no group REST history endpoint. The sync/snapshot protocol closes this while at least one earlier member is online. If every earlier member is offline, a late joiner sees an empty room until a new event arrives.
- Snapshot backfill truncates very large rooms to the newest 200 feedback items and about 11 KB; snapshots carry a `tr` flag when truncated. Votes are included only for included feedback.
- The send cooldown is per adapter instance in the browser; a reload resets it. Fine for a client-side courtesy limit.
- Rate limiting is in-memory per server instance; best-effort on serverless (will be noted in the README).
- Group creation is attempted on every join, so an existing room costs one failed create + one successful join. Acceptable; keeps the flow idempotent without a second lookup API.
- The first reviewer to enter an empty room becomes the group owner. The app never exposes owner-only actions.
- The live tests created real users (u_... per SPEC) and groups (pr_...) in the Nexconn app. Test rooms are prefixed pr_ and are safe to leave.
- npm printed an allow-scripts warning for esbuild's postinstall during install; Vite build works anyway. No permission settings were changed.

## Security notes
- App Secret exists only in .env and server runtime. No server module is imported by src/. check-no-secret passes on the built bundle.
- The client only gets VITE_NEXCONN_APP_KEY. Tokens are fetched per session from /api/token and are never logged.
- No CORS headers, no analytics, no external fonts or CDNs.
