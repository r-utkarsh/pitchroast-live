# Status

Updated: phase 5, 2026-11-19.

## Verified live (real Nexconn Singapore app, .env keys present)
- Phase 1 API facts: POST /api/token returns a real access token (never printed) for test users; POST /api/join creates pr_ groups, adds a second reviewer and is safe to repeat. The local API returns 400/405/413/429 correctly, enforces the 2 KB body and the 20/min limit, and sends Retry-After.
- Unit tests: **77 tests across 10 files** pass (validation, protocol, reducer, digest, session, cooldown, timer, server validation, server HTTP utilities, server handlers). They cover tampered/oversized payloads, unsafe URL schemes, out-of-range timestamps, malformed protocol events, votes before feedback targets, duplicate sends/merge, cooldown windows, timer countdown/end, request guards, rate limiting and blocked-storage fallback.
- Playwright: **4 tests in 2 specs** pass against the real Nexconn service in ~28 s:
  - create a room and share the link; a second reviewer joins, a Fix message appears live in both views exactly once after a double click;
  - an upvote from the other reviewer updates both views, toggling off returns to 0, and a self-upvote restores it;
  - a third reviewer joining later receives the earlier messages and votes through the sync/snapshot backfill;
  - tag filters show the right subsets, the empty filtered state appears, and Top feedback sorts by votes then time and toggles back;
  - Copy Markdown and Download .md contain the title, the right section, text and vote line; the downloaded file parses;
  - a refresh restores identity, history and vote counts;
  - the creator sees **Start 5-min roast**, the countdown syncs to the other reviewer, and “/” focuses the composer;
  - the composer is usable at 375x812, there is no horizontal scroll at 320/375/1280, and the name gate shows a real focus ring with a working Tab order;
  - a browser with both storage APIs blocked still connects live (in-memory Storage shim) and shows no recent rooms after a reload;
  - a forced 429 from /api/token shows a friendly message and the Retry button reconnects;
  - offline then online shows the offline banner, clears it and resumes live delivery;
  - "Open as another reviewer" opens the name gate; the demo, 404 and broken/tampered-link pages render.
- `npm run verify` passes: typecheck, **77 tests**, production build (1,216 kB / 275 kB gzip) and secret scan. `npm run test:e2e` passes all **4 tests**. Ports 5173/8787 were free afterwards.
- Submission screenshots were captured with Playwright from two live contexts at exact sizes: 1280x800 and 375x812 for landing, room and Markdown export, plus a rendered Markdown file. `submission/writeup.pdf` is 287,503 bytes and references those files.
- The production bundle was grepped for `__smoke` and smoke-page strings: absent. `/__smoke` renders only when `import.meta.env.DEV` is true.
- Accessibility: all inputs have labels and aria-describedby wiring, buttons have text or aria-labels, pressed states use aria-pressed, status/new messages use aria-live, focus-visible rings are global, and motion uses `motion-safe` plus a reduced-motion scroll check. Contrast: tag chips 6.23–9.19:1, muted ink-500 text 4.87:1, white on the primary button 4.70:1, ink-300 text 7.59:1. The timer countdown has an accessible label and the composer hint explains “/”.

## Submission assets
- `README.md` — product, problem, features, stack, Nexconn SDK usage, architecture, folder map, env vars, local run, tests, Vercel deploy, limitations, license note.
- `submission/writeup.html` and `submission/writeup.pdf` — problem, solution, users, Nexconn usage, architecture, screenshots, 60-second test, growth path. Required placeholders `[PASTE APP KEY]`, `[PASTE LIVE URL]`, `[PASTE GITHUB URL]`, `[PASTE TRACTION PROOF]` are intentionally left for the human.
- `submission/screenshots/` — 7 PNGs: landing, room with feedback, mobile room, Markdown export (desktop and mobile), and the rendered Markdown file, all at 1280x800 or 375x812.
- `submission/sample-export.md` — a real exported checklist from the screenshot room.
- `submission/demo-script.md` — 2-minute script with timings, exact clicks and narration.
- `submission/CHECKLIST.md` — deployment, two-device test, placeholders/PDF, video, traction proof and the Nov 22, 2026 deadline.
- `scripts/capture-submission.mjs` and `scripts/render-writeup.mjs` — repeatable screenshot and PDF generation.

## Security verification
- `check-no-secret` scanned dist/ and found no App Secret (raw or base64). A second scan of 92 project files (excluding `.env`, `node_modules`, `.git` and test artifacts) found no raw or base64 secret in code, docs or submission assets. The client receives only VITE_NEXCONN_APP_KEY; tokens are fetched per session and never logged.
- Source grep found no `dangerouslySetInnerHTML`, `innerHTML`, `eval(`, `new Function`, or `document.write`; the source has no TODO/FIXME/console.log leftovers (only safe server warnings with error codes and variable names).
- External project links use `target="_blank"` with `rel="noopener noreferrer"`.
- Input is validated on both client and server (names, titles, pitches, URLs, room/user IDs, payload size, body size, rate limits). URLs are http/https only and capped at 300 chars. Chat payloads are JSON text and are never rendered as HTML.
- No CORS headers, analytics, trackers, external fonts or CDNs.
- `npm audit --omit=dev`: **2 moderate** advisories in react-router 6.30.6 (open-redirect via backslash; SSR hydration constructor injection). **No high or critical** findings. The only fix is react-router-dom 7.18.6, a breaking major upgrade, so it was not applied; the app's links are internal generated paths and SSR is not used.

## PENDING
- Human-only submission steps: deploy to Vercel with the four env vars, replace the four write-up placeholders, regenerate the PDF, record the demo video, invite real reviewers and attach traction proof. See `submission/CHECKLIST.md`.
- Manual Firefox, Safari and Edge pass: only Chromium is installed locally.
- The timer’s **ended/locked** state is unit-tested through the countdown helpers but not exercised in live e2e, because a full round is five minutes.

## KNOWN LIMITATIONS
- Nexconn group history is membership-scoped: late joiners cannot read messages sent before they joined, and there is no group REST history endpoint. The sync/snapshot protocol closes this while at least one earlier member is online. If every earlier member is offline, a late joiner sees an empty room until a new event arrives.
- Snapshot backfill truncates very large rooms to the newest 200 feedback items and about 11 KB; snapshots carry a `tr` flag when truncated. Votes are included only for included feedback.
- The send cooldown is per adapter instance in the browser; a reload resets it.
- Rate limiting is in-memory per server instance; best-effort on serverless.
- Group creation is attempted on every join, so an existing room costs one failed create + one successful join.
- The first reviewer to enter an empty room becomes the group owner. The app never exposes owner-only actions.
- The roast timer's “creator” is the tab/session that created the room (a sessionStorage flag), not a server-verified owner. If the creator closes that tab, other reviewers can still see the countdown but cannot start a new round from their own sessions. Countdowns use each device's clock and can differ by a few seconds.
- Demo rooms open empty by design: `/api/seed-demo` was skipped, and no fake messages are inserted into a real channel. The sample project, title and pitch still demonstrate the flow.
- When browser storage is fully blocked, the in-memory shim keeps chat working for that page load, but identity and recent rooms are lost on reload. When only sessionStorage is blocked, identity falls back to module memory and recent rooms still work.
- Clipboard fallback uses a hidden textarea and `execCommand`; if both clipboard APIs are unavailable the UI shows an inline message telling the user to select the URL or download the .md file instead. The fallback path is not exercised by the automated suite because Chromium grants clipboard access.
- Send-failure cards (Retry/Remove) and the kicked-session reconnect are implemented and reviewed, but the live e2e suite does not inject SDK-internal send/kick faults; forcing them would require mocking the Nexconn SDK, which the product deliberately does not do.
- Only Chromium was exercised in automated tests. The UI uses standard APIs, a clipboard fallback and a reduced-motion query; Firefox/Safari/Edge still need a manual pass.
- The production JS bundle is ~1.2 MB (275 KB gzip) because the Nexconn SDK ships as one chunk; Vite prints a >500 KB warning. No code splitting was added.
- The live tests created real users (u_... per SPEC) and groups (pr_...) in the Nexconn app. Test rooms are prefixed pr_ and are safe to leave.
- npm printed an allow-scripts warning for esbuild's postinstall during install; Vite build works anyway. No permission settings were changed.
