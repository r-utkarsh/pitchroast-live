# Final report — PitchRoast Live

## Summary

PitchRoast Live is complete: a one-link live pitch-review room where reviewers leave tagged, upvotable feedback and the builder exports a Markdown to-do list. Chat runs through the real Nexconn Chat SDK, with server-side token and group-join endpoints. The app is tested end-to-end against a real Singapore Nexconn app.

- **Stack:** React 18, TypeScript strict, Vite 8, Tailwind 3, react-router-dom 6, Express 5 locally, Vercel functions in `api/`, Nexconn Chat SDK 26.2.1.
- **Flow:** create a room → share the link → reviewers join with a name → tagged feedback and votes sync live → copy/download Markdown.
- **Extras:** optional 5-minute roast timer, late-joiner snapshot backfill, retry/offline recovery, mobile layouts, accessible controls.
- **Verification:** `npm run verify` passes (77 unit tests across 10 files, build, secret scan); `npm run test:e2e` passes 4 Playwright tests against real Nexconn in ~28 s.

## Folder tree

Generated folders (`node_modules`, `dist`, `test-results`) and local secrets (`.env`) are omitted.

```text
pitchroast-live/
├─ api/                     Vercel function wrappers (token, join)
├─ e2e/                     Playwright live tests (ui, smoke)
├─ public/                  favicon.svg
├─ scripts/                 check-no-secret, live-check, capture-submission, render-writeup
├─ server/
│  ├─ handlers/             token.ts, join.ts
│  ├─ dev.ts                local Express server (:8787)
│  ├─ env.ts                .env loading, region and credentials
│  ├─ nexconn.ts            Nexconn Server API client
│  ├─ http.ts               body limits, rate limits, responses
│  └─ *.test.ts             server unit tests
├─ src/
│  ├─ components/           AppHeader, StatusIndicator, ui, room/*
│  ├─ hooks/                useIdentity, useChatRoom
│  ├─ lib/                  validation, protocol, reducer, digest, session,
│  │                        cooldown, chat adapter, timer
│  ├─ pages/                Landing, Room, Demo, BrokenRoom, NotFound, Smoke
│  ├─ App.tsx, main.tsx     routes and entry point
│  └─ index.css
├─ submission/
│  ├─ screenshots/          7 PNGs at 1280x800 / 375x812
│  ├─ writeup.html          submission write-up
│  ├─ writeup.pdf           print-ready PDF
│  ├─ sample-export.md      real exported checklist
│  ├─ demo-script.md        2-minute video script
│  └─ CHECKLIST.md          human submission steps
├─ README.md
├─ FINAL_REPORT.md
├─ PROGRESS.md, DECISIONS.md, STATUS.md, HANDOFF.md
├─ package.json, package-lock.json
├─ vite.config.mts, vitest.config.mts, playwright.config.ts
├─ tailwind.config.cjs, postcss.config.cjs
├─ tsconfig.json, vercel.json, index.html
├─ .env.example, .gitignore
└─ AGENTS.md, SPEC.md, phase-1..5 files (not part of the product)
```

## Commands

```bash
npm install
npm run dev            # web on http://localhost:5173, API on :8787
npm run typecheck
npm test               # 77 unit tests
npm run build
npm run check-secret
npm run verify         # typecheck + test + build + secret scan
npm run test:e2e       # 4 live Playwright tests (needs .env)
node scripts/live-check.mjs          # API smoke while dev is running
node scripts/capture-submission.mjs  # regenerate screenshots (needs dev + .env)
node scripts/render-writeup.mjs      # regenerate writeup.pdf
npm audit --omit=dev
```

## What changed from the plan and why

- **Text messages carry JSON** instead of a Nexconn custom message type: zero registration, survives SDK upgrades and keeps parsing in one module. SPEC allows it.
- **Late-joiner history uses a sync/state protocol** because Nexconn group history is membership-scoped and there is no REST history endpoint. This was verified live and documented as a limitation when every earlier member is offline.
- **Demo seeding was skipped**: `/api/seed-demo` is optional and the implemented Server API surface does not send chat messages. Demo rooms open empty with a real sample project.
- **Roast timer is creator-controlled through a sessionStorage flag** because rooms have no server-side owner role. It uses the existing `timer` protocol event and locks the composer when the round ends.
- **No SDK presence work**: the room shows the number of distinct reviewers seen in state, which is the phase’s allowed fallback.
- **No license file** was added because the license is the owner’s choice.
- **No breaking dependency upgrade** for two moderate react-router advisories; no high/critical issues exist and the offered fix is v7.

## Verified live

- Two reviewers connect to a real Nexconn group, exchange tagged feedback and votes in both directions; a late joiner receives earlier messages and votes through the snapshot.
- Filters, Top sort, Markdown copy and download, refresh identity/history, upvote toggle, mobile 375x812, 320 px overflow, blocked storage, token 429 retry, offline/online recovery, invalid links, demo and 404.
- Creator starts the 5-minute roast timer; the countdown syncs to the second reviewer; “/” focuses the composer.
- `npm run verify` and `npm run test:e2e` pass; secret scans are clean; ports 5173/8787 are free after tests.
- Screenshots were generated from live rooms at exact sizes and are referenced by the write-up.
- The Vercel deployment was created with all four environment variables. Its static site loaded, but the first function build kept ESM output and every `/api/*` call failed with `FUNCTION_INVOCATION_FAILED` because of extensionless imports. The CommonJS fix is verified locally (full suite plus a compiled-function simulation) and needs one push/redeploy.

## PENDING

- Push the deployment fix (`package.json`, `tsconfig.json`, `vite.config.mts`, `vitest.config.mts`, docs), let Vercel redeploy, and confirm `/api/token` returns 405 for a GET and a room creates successfully.
- Human-only: test on two devices, fill the write-up placeholders and regenerate the PDF, record the demo video, invite real reviewers, collect traction proof, submit before **Nov 22, 2026**.
- Manual Firefox, Safari and Edge pass (only Chromium available locally).
- The timer’s ended/locked state is unit-tested but not run for five real minutes in e2e.

## Known limitations

- Group history is membership-scoped; the snapshot backfill needs at least one earlier member online.
- Snapshots cap at 200 feedback items / ~11 KB.
- Rate limits and cooldown are in-memory/per adapter and best-effort on serverless.
- Demo rooms start empty.
- Blocked browser storage works only for the current page load.
- Only Chromium is covered by automated tests.
- The bundle is ~1.2 MB (275 KB gzip) because of the Nexconn SDK chunk.
- The timer creator flag is per tab/session, and countdowns use each device’s clock.

## First three things the human should do next

1. Commit and push the deployment fix, let Vercel redeploy, confirm `/api/token` returns 405 for a GET (not 500), then create a room and test it on two devices.
2. Replace the four placeholders in `submission/writeup.html`, run `node scripts/render-writeup.mjs`, and verify the PDF has no secret and no placeholders left.
3. Invite real reviewers for traction proof, record the 2-minute demo using `submission/demo-script.md`, and submit using `submission/CHECKLIST.md` before Nov 22, 2026.
