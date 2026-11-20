# Handoff

All five phases are complete. There is no further code phase; the remaining work is human submission.

## Done

- **Phases 1–3:** Vite/React/Tailwind skeleton, local Express API and Vercel wrappers, live Nexconn token/group-join, full protocol/reducer/digest/session/cooldown layer, landing, room, demo, broken-link and 404 pages, responsive layout and docs.
- **Phase 4:** connection/retry/offline recovery, kicked-session handling, send-failure cards, duplicate-send guard, timestamp bounds, in-memory storage shim, server HTTP/handler tests, AA contrast, focus/aria/reduced-motion, expanded Playwright coverage.
- **Phase 5:** optional 5-minute roast timer (creator flag, synced countdown, composer lock, restart), distinct-reviewer count, “/” composer shortcut, README, 7 submission screenshots at 1280x800/375x812, write-up HTML + PDF with required placeholders, sample export, 2-minute demo script, submission checklist, final report.
- `npm run verify` passes (77 tests across 10 files, build, secret scan). `npm run test:e2e` passes 4 live tests in ~28 s. Ports 5173/8787 are free; no project processes are left running.
- Secret scans are clean (dist and 92 project files, raw and base64). `npm audit --omit=dev` reports 2 moderate react-router advisories and no high/critical issues.
- **Vercel deployment fix (2026-11-19):** the static app deployed, but every `/api/*` call returned `FUNCTION_INVOCATION_FAILED`. Cause: the package was `"type": "module"` while the compiled functions used extensionless relative imports. Removed the package module type so Vercel emits CommonJS, and renamed the Vite configs to `.mts`. Re-verified with the full local suite and a Node simulation of the compiled function. The fix is in the working tree and needs a commit/push to redeploy.

## Not done

- **Push the deployment fix and redeploy:** commit the `package.json`, `tsconfig.json`, `vite.config.mts`, `vitest.config.mts`, and docs changes, push to `origin/main`, let Vercel redeploy, then confirm `/api/token` returns 405 for a GET (not 500) and a room creates successfully.
- Human-only submission work: two-device live test, fill `[PASTE ...]` placeholders, regenerate PDF, record demo video, collect traction proof, submit before Nov 22, 2026. See `submission/CHECKLIST.md`.
- Manual Firefox/Safari/Edge pass (only Chromium installed).
- Timer end/lock state is unit-tested, not run for a full five minutes in live e2e.
- `/api/seed-demo` remains intentionally skipped.

## Commands that work

- `npm run dev` -> Vite http://localhost:5173 + API http://localhost:8787. Background it with logs redirected, stop it afterwards.
- `npm run typecheck`, `npm run test`, `npm run build`, `npm run check-secret`, `npm run verify`.
- `npm run test:e2e` -> Playwright starts the dev servers; 4 tests, 2 specs, multiple browser contexts, ~28 s.
- `npx playwright test e2e/ui.spec.ts` for the UI flows alone.
- `node scripts/live-check.mjs` while dev is up (local API smoke; prints no tokens).
- `node scripts/capture-submission.mjs` while dev is up (regenerates screenshots; needs .env).
- `node scripts/render-writeup.mjs` (regenerates `submission/writeup.pdf`; no server needed).
- `npm audit --omit=dev` (exits 1 because of two moderate react-router advisories).

## Gotchas

- `.env` holds the real Singapore keys. Never cat it or print values. Only `VITE_NEXCONN_APP_KEY` reaches the client. `src/` must never import `server/` or `api/`.
- The App Secret is server-only; `check-no-secret` scans `dist/`. Do not add logging of tokens or headers.
- Nexconn history is membership-scoped; an empty late-joiner history is expected. The sync/snapshot handshake needs at least one earlier member online.
- `NCEngine.disconnect()` is global to the page; one adapter per room mount, handlers removed in cleanup. `main.tsx` intentionally does not use StrictMode to avoid double connect/disconnect in dev.
- `?as=new` is consumed by `useIdentity`; the flag is stripped only after a successful claim.
- The storage shim replaces `window.localStorage`/`sessionStorage` with in-memory Storage only when access throws. It is called once in `main.tsx` before render; keep that order.
- Protocol timestamps and SDK `sentTime` are capped at 8,640,000,000,000,000. Keep the bound when adding timestamp fields; FeedbackCard also guards invalid dates.
- `/__smoke` is behind `import.meta.env.DEV`; re-grep `dist/` after touching `App.tsx`.
- Cooldown applies only to `fb`/`vote`/`timer`, not `sync`/`state`; control messages are still protocol-validated. A reconnect creates a new adapter and resets the in-browser cooldown window.
- The roast timer is fixed at 300 s. The creator flag is sessionStorage, set by the tab that creates the room; a different reviewer session cannot start a new round. Countdowns derive from the event’s `startAt` and each device’s clock.
- Room IDs are 10 base32 chars (`a-z2-7`), demo rooms `demo-` + 10; channel ID is `pr_` + roomId with `-` -> `_`.
- Demo rooms open empty; do not insert mock messages into real channels.
- Playwright’s `webServer` stops the dev servers, but check ports 5173/8787 at the end of any session anyway.
- **Vercel API functions must stay CommonJS.** `package.json` intentionally has no `"type": "module"`, the Vite configs are `.mts`, and `api/tsconfig.json` forces `module: Node16` with `moduleResolution: Node16` for the function build. Vercel keeps ESM `.js` output as ESM when the package says module, and the extensionless `../server/...` imports then crash with `ERR_MODULE_NOT_FOUND` / `FUNCTION_INVOCATION_FAILED`. If you re-add `"type": "module"`, add `.js` extensions to every relative import in `api/` and `server/` first.
- No write git commands. Do not edit AGENTS.md, SPEC.md or the phase files.

## Next phase starts with

No code phase remains. First commit and push the deployment fix, wait for the Vercel redeploy, and confirm `/api/token` returns 405 for a GET and a room creates successfully. Then continue with `submission/CHECKLIST.md`: test on two devices, fill the write-up placeholders and regenerate the PDF, collect traction proof, record the video and submit before Nov 22, 2026.
