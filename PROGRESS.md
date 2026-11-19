PHASE 1: DONE
- [x] PROGRESS.md, DECISIONS.md, STATUS.md created
- [x] Skeleton: package.json, tsconfig, Vite, Tailwind, index.html, vercel.json, .gitignore, .env.example, Playwright, Vitest
- [x] Dependencies installed and pinned exact; typecheck, test and build pass
- [x] scripts/check-no-secret.mjs wired into verify
- [x] Nexconn discovery; facts and channel type A recorded in DECISIONS.md
- [x] Server handlers token + join, Express dev server, thin api wrappers
- [x] npm run dev verified; live token + group create/join (13/13 checks); servers stopped

PHASE 2: DONE
- [x] src/lib/validation.ts (payload encode/decode, URL rules, names, user/room IDs, channel mapping)
- [x] src/lib/protocol.ts (feedback/vote/timer + sync/state control events, strict parsing)
- [x] src/lib/reducer.ts (dedupe, ordering, last-vote-wins, votes before targets, reviewer upsert, snapshot merge/build)
- [x] src/lib/digest.ts (SPEC Markdown structure)
- [x] src/lib/session.ts (identity, last name, recent rooms, in-memory fallback)
- [x] src/lib/cooldown.ts (5 sends / 10 s)
- [x] src/lib/chat.ts is the only file importing @nexconn/*; full ChatAdapter
- [x] 56 unit tests across 7 files pass
- [x] Dev-only /__smoke page; Playwright three-context live smoke passes (live delivery + late-joiner snapshot)
- [x] npm run verify passes; no servers left running

PHASE 3: DONE
- [x] Shared UI layer src/components/ui.tsx (Button, Card, Field, inputs, chips, tag pills, Banner, Spinner, skeleton, tag meta) using the Tailwind theme tokens
- [x] Favicon, page title and meta description (already in index.html; kept for this phase)
- [x] Router: /, /r/:roomId, /demo, friendly 404; /__smoke behind import.meta.env.DEV
- [x] Landing: headline, create form with inline validation and counters, Try the demo, Recent rooms (max 5, payload-aware)
- [x] Create flow: validate, build base64url payload + room ID, navigate to /r/:roomId?d=...
- [x] Demo: fresh demo- room with the built-in Nebula Notes project, then redirect
- [x] Broken room page for missing/invalid/tampered payloads and malformed room IDs
- [x] Room: name gate with last-name prefill, project card, feedback list, composer with tags, upvotes, filters, Top sort
- [x] Hooks: useIdentity and useChatRoom (connect, history, sync/snapshot handshake, optimistic send, retry/remove, vote, cooldown, reconnect)
- [x] Copy room link, Open as another reviewer (?as=new), Copy feedback as Markdown, Download .md
- [x] Auto-scroll near the bottom plus New messages pill; skeleton, empty and history-unavailable states
- [x] Responsive: desktop two columns; mobile stacked with collapsible project card; no horizontal scroll at 320/375/1280
- [x] Playwright UI test: create, two reviewers, live feedback, upvote sync, late-joiner backfill, filters, sort, download, demo, 404, broken link
- [x] /__smoke route absent from the production bundle
- [x] npm run verify and npm run test:e2e pass; no servers left running

PHASE 4: DONE
- [x] SPEC section 6 audit: connection failure + Retry, token backoff, kicked/token refresh once, offline/online recovery, send failures, duplicate sends, whitespace/500 limits, cooldown, optimistic reconciliation
- [x] History: join load, late-joiner sync/snapshot, refresh identity + history, unavailable-history note
- [x] Display: escaped text only, line breaks, wrapping, emoji/RTL, near-bottom auto-scroll + New messages, empty state, skeleton, local timestamps
- [x] Links: invalid/missing/tampered/oversized payloads, unsafe schemes, empty rooms, direct deep links, back/forward
- [x] Browser: in-memory Storage shim when storage is blocked (the Nexconn SDK needs localStorage), clipboard fallback, 320/375 layouts, keyboard labels/focus
- [x] Server: missing env names logged without values, invalid JSON, wrong method, oversized body, 429 + Retry-After, friendly join/token errors, no crash
- [x] Accessibility: focus-visible ring, labels/aria-invalid/describedby, aria-pressed, aria-live status + new messages, AA tag chip and muted text contrast, reduced motion
- [x] Security: validation on both sides, secret absent from dist, no dangerous APIs, external rel="noopener noreferrer", dependency audit recorded
- [x] Unit tests: 73 tests across 9 files (adds server http/handlers, timestamp bounds, storage fallback)
- [x] Playwright: 4 tests in 2 specs against real Nexconn (create/live Fix, upvote toggle both views, filters, Top sort, Markdown copy/download, refresh, late-joiner backfill, 375x812 + 320, blocked storage, token 429 retry, offline/online, invalid/tampered links)
- [x] npm run verify and npm run test:e2e pass; ports 5173/8787 free

PHASE 5: DONE
- [x] Demo seeding reviewed again and kept skipped: the implemented Server API surface does not send chat messages; decision and limitation recorded
- [x] 5-minute roast timer: creator flag in the creating tab, timer protocol event, synced countdown, locked composer, Start new round
- [x] Online reviewer count uses the distinct reviewers seen in room state (no extra SDK presence work)
- [x] Small polish: "/" focuses the composer outside form fields; hints updated; timer and export Playwright coverage
- [x] README: problem, features, stack, Nexconn usage, architecture, folder map, env vars, local run, tests, Vercel deploy, limitations, license note
- [x] submission/screenshots: landing, room with two-context feedback, mobile room, Markdown export at 1280x800 and 375x812; sample-export.md
- [x] submission/writeup.html and writeup.pdf with required placeholders, screenshots and growth path
- [x] submission/demo-script.md (2-minute script with timings, clicks, narration)
- [x] submission/CHECKLIST.md with the human steps and Nov 22, 2026 deadline
- [x] npm audit --omit=dev: 2 moderate react-router advisories, no high/critical, no safe non-breaking fix
- [x] Final npm run verify (77 tests, 10 files), npm run test:e2e (4 tests), full-folder secret scan, ports 5173/8787 free
- [x] FINAL_REPORT.md written
