# Decisions

One line per decision (what, why). Nexconn facts were verified against the live docs and the live API in phase 1.

## Product and stack
- React 18 + Vite + Tailwind 3 + react-router-dom 6 as specified; exact versions pinned in package.json. Current npm resolved Vite 8, TypeScript 7, Vitest 5; all work on the installed Node 24.16.0.
- Local API uses Express 5 in server/dev.ts and mounts the exact same handlers as the Vercel wrappers, so local and production behavior match.
- /api/*.ts wrappers use small local request/response types instead of the @vercel/node package: fewer dependencies, same default-export shape Vercel expects.
- Environment files are loaded with Node's built-in process.loadEnvFile (Node 24 locally); on Vercel the platform injects env vars. No dotenv dependency.
- Vite injects the client App Key through define (VITE_NEXCONN_APP_KEY derived from NEXCONN_APP_KEY), so only the key ever reaches the bundle.
- Text messages carry a JSON string instead of a Nexconn custom message type: no registration step, survives SDK upgrades, and all parsing stays in src/lib/protocol.ts. SPEC allows this.
- Channel type A: a server-created group channel, with the server adding each reviewer through /v4/group-channel/join. Keeps the App Secret server-side and gives live delivery plus history for messages sent while the viewer was a member. Verified live: history only covers the membership window, so late joiners do not see earlier messages from the SDK (see the sync protocol below).
- Channel ID is "pr_" + roomId, with "-" mapped to "_" for demo rooms (e.g. pr_demo_abc...), because room IDs may start with "demo-" and Nexconn group IDs are safest with letters, digits and underscores.
- Group name is the channel ID; /api/join only receives {userId, roomId}, and the human title lives in the room link payload.
- Rate limiting is an in-memory sliding window per process; best-effort on serverless, documented in the README later.
- No NEXCONN_NAV_URL override: the web SDK selects its navigation/connection endpoints from AreaCode, and the docs expose no nav URL setting. Region is still overridable on the server with NEXCONN_API_BASE_URL.
- User IDs follow SPEC exactly ("u_" + 16 lowercase hex). The pr_ creation prefix applies to rooms and channel/group IDs, which are what the app creates in the Nexconn account.
- Nexconn identifiers are limited to 32 characters wherever we generate them (SPEC 4.5), well under the API's 64-byte limits.
- Room IDs are 10 lowercase base32 characters (a-z, 2-7); demo rooms use the prefix "demo-". Base32 keeps links readable and safe for channel IDs. Client and server validators were updated together.
- Late-joiner backfill: because Nexconn group history is membership-scoped, a new joiner sends a validated `sync` control message over the real channel and any online earlier member replies with one `state` snapshot (feedback, votes, timer, newest-first truncation with a `tr` flag). This is the closest working alternative; it needs at least one earlier member online, documented as a limitation.
- Sync/state control messages do not consume the human send cooldown (5 per 10 s), so backfill cannot get stuck behind a user's quota. Every event, including control messages, still goes through strict protocol parsing.
- Snapshot size is capped at 11 KB and 200 feedback items, well below the Nexconn 128 KB text-message content limit (MAX_MESSAGE_CONTENT_BYTES = 131072, checked in @nexconn/engine).

## Phase 3 UI
- Recent rooms store the encoded room payload alongside the title, so a recent room reopens with its project details; entries without a payload still render as plain text instead of a broken link.
- "Open as another reviewer" appends `?as=new` and uses `window.open` with noopener: some browsers clone sessionStorage into the new tab, so the flag forces the name gate and a fresh `u_...` identity, then the flag is stripped with replace navigation.
- Room behavior lives in one `useChatRoom` hook (adapter lifecycle, ingest, sync/snapshot, optimistic list, votes, reconnect) so pages stay presentational; state is keyed by room + userId and reset if either changes.
- Success and failure feedback use inline Banners plus per-message failed cards (Retry/Remove) instead of toasts: nothing auto-dismisses and every error stays reachable by keyboard.
- The optional `/api/seed-demo` endpoint is skipped (SPEC marks it optional): the demo route opens a real empty Nexconn room with the built-in sample project, and server-side message sending is not part of the implemented REST surface. No fake/mock messages are inserted.
- `/__smoke` is rendered only when `import.meta.env.DEV` is true; the production bundle was grepped for smoke strings and is clean.

## Phase 4 hardening
- When browser storage is blocked, install an in-memory Storage on window before render. The Nexconn SDK needs localStorage to connect, and defining the shim keeps live chat usable; the app's own readers still fall back to module memory if the property cannot be replaced. The shim is per page load, so a reload loses identity and recent rooms in that environment.
- Bound every protocol timestamp and SDK `sentTime` to the JavaScript Date maximum, and guard date formatting in FeedbackCard. Out-of-range values passed the old finite/non-negative checks and `toISOString()` threw a RangeError, which could take down the room render.
- Lightened ink-500 from #4a5573 to #77819c and darkened accent-500 from #6366f1 to #5f62ee. Small muted text was 2.56:1 and white on the primary button 4.47:1; both now pass WCAG AA (4.87:1 and 4.70:1). Tag chip combinations were already 6.2–9.2:1 and are unchanged.
- An unexpected disconnect while online creates a fresh adapter and token once (8 s delay), because a stale token also surfaces as a disconnect. Offline disconnects wait for the browser online event instead, and the manual Retry button resets the one-shot flag.
- Separate friendly 429 messages for `/api/token` and `/api/join`; the server also sends a numeric Retry-After header, and the rate-limit bucket is checked before body parsing.
- Server handler and HTTP utilities are tested directly (method, JSON, body size, rate limit, Retry-After, error shape) instead of mocking the Nexconn SDK. The real SDK paths stay covered by the live Playwright suite.
- The Playwright storage test denies both storage APIs and still expects a live room, which verifies the shim; it also confirms recent rooms are gone after a reload because the replacement storage is in-memory.
- npm audit reports two moderate react-router advisories. The only offered fix is react-router-dom 7.18.6 (a breaking major upgrade), so it was not applied; there are no high or critical findings.

## Phase 5 stretch and submission
- The roast timer is a fixed 300-second round. The creating tab marks the room in sessionStorage, because rooms have no server-side owner role and the creator is only known client-side; that tab can start the first round and a new round after the timer ends. The existing `timer` protocol event carries `startAt` and `durSec`, every reviewer derives the countdown from it, and the composer locks at zero.
- The online count stays as the number of distinct reviewers seen in room state instead of adding SDK presence: the reducer already tracks every reviewer who sent an event or appeared in a snapshot, and presence would add another subscription surface for little demo value.
- "/" focuses the composer only when focus is outside an input, textarea, select or contenteditable element, so typing a slash in feedback is unaffected and the shortcut works from anywhere in the room.
- `/api/seed-demo` remains skipped and is documented as a limitation; the demo room still opens a real empty Nexconn channel with the sample project.
- Submission screenshots are captured by `scripts/capture-submission.mjs` with two live browser contexts; the write-up is rendered to PDF by `scripts/render-writeup.mjs`. Both use system fonts and no external assets, and the write-up keeps the required placeholder tokens for the human to fill.
- No license file is added because the license is the owner's choice, as the phase requires.
- Cooldown notices use an amber warning banner instead of the red error banner, and the "Top feedback" sort toggle is separated from the tag filters by a divider with an arrow and a "Sort by upvotes" tooltip. The rate limit was being read as a failure, and the sort toggle was being read as another filter; this makes both behaviors obvious without changing the 5-sends-per-10-seconds limit.
- Demo rooms hide the "Open live project" button and the project URL link, and show a "Demo project — no live site" note instead. The sample project points at example.com, so the primary button dropped people on the IANA placeholder page; real rooms keep the button and expose the destination URL as a tooltip.
- The landing form's pitch field is a textarea instead of a single-line input, and Enter in it submits the form while Shift+Enter inserts a newline. A single-line input treats Shift+Enter as Enter and implicitly submits the form, which created a room mid-typing; the room page composer already used the Enter-to-send / Shift+Enter-newline convention, so the create form now matches it. The 1-140 character pitch limit from SPEC section 3 is unchanged.

## Deployment fix (2026-11-19)
- The first Vercel deployment returned `FUNCTION_INVOCATION_FAILED` for every `/api/*` request, including `GET`. Root cause: `package.json` declared `"type": "module"`, so Vercel kept the compiled API files as ESM, while their relative imports (`../server/handlers/token`) had no extensions. Node ESM refused to resolve them and the function crashed before the handler ran. The exact `ERR_MODULE_NOT_FOUND` was reproduced locally against the TypeScript output.
- Removed `"type": "module"` so Vercel compiles the API functions from ESM to CommonJS, where extensionless imports resolve. The two Vite configs were renamed to `.mts` so they remain ESM and build without warnings. The fix was verified with `npm run verify`, `npm run test:e2e`, a local live `/api/token` call, and a CJS simulation of the compiled functions; the Vite configs must stay `.mts` unless `"type": "module"` is restored together with explicit `.js` import extensions.

## Nexconn facts (verified Nov 2026)
Sources: docs.nexconn.ai (web SDK, server integration, data centers, users, group channels) plus live calls from this machine. Live verification used the Singapore app in .env.

### Packages and init
- Packages: @nexconn/chat 26.2.1 with peer @nexconn/engine 26.2.1. Import from '@nexconn/chat' (it re-exports the engine types).
- Init once per app lifecycle: `NCEngine.initialize({ appKey, areaCode: AreaCode.SG, logLevel? })`. Default area is SG. `AreaCode` values: BJ=1, SG=2, NA=3, SA=5, OM=6.
- The App Key is public client config; the App Secret is server-only and is never bundled.

### Server API (App Secret stays here)
- Singapore base URL: https://api.sg-light-api.com (backup https://api-b.sg-light-api.com). North America: api.us-light-api.com, Saudi Arabia: api.sau-light-api.com.
- Every request: POST, HTTPS, headers `App-Key`, `Nonce` (unique, max 18 chars), `Timestamp` (Unix ms), `Signature` (lowercase hex SHA1 of App Secret + Nonce + Timestamp), `Content-Type: application/json`.
- Issue a token: POST /v4/auth/access-token/issue, body `{ "userId", "name", "avatarUrl"? }`. Success: HTTP 200 `{ "code": 0, "result": { "userId", "accessToken" } }`. Calling it again for the same userId issues a fresh token and updates the push name. Rate limit 200/s.
- Token is max 256 bytes and valid until expiry (indefinite by default; refreshing the App Secret invalidates all tokens).
- Create group: POST /v4/group-channel/create, body `{ "channelId", "name", "owner", "userIds"? }`. The creator becomes owner and automatically joins. channelId max 64 chars. Rate limit 100/s.
- Join group: POST /v4/group-channel/join, body `{ "channelId", "userIds": [...] }`. Adds users without approval, max 100 users per call. Re-joining is safe in practice (verified).
- Live verified in phase 1: token issue for two users, group create, second-user join, and re-join all returned HTTP 200 / code 0.

### Client SDK
- Connect: `NCEngine.connect({ token })` -> `RCResult<{ userId }>`; check `result.isOk` (code 0). The SDK reconnects automatically; call connect once per app lifecycle.
- Connection state: `RCConnectionStatus` values CONNECTED=0, CONNECTING=1, DISCONNECTED=2, SUSPENDED=3. Register with `NCEngine.addConnectionStatusHandler(id, new ConnectionStatusHandler({ onConnectionStatusChanged({ status, code }) {} }))`; remove with the same id.
- Group channel: `const ch = new GroupChannel(channelId)`; `ch.channelId` and `ch.identifier` give the channel identifier used by history queries.
- Send: `await ch.sendMessage(new SendTextMessageParams({ text }))` -> `RCResult<Message>`; on success `result.data` has `messageId`, `sentTime` (ms), `senderUserId`, `direction`, and `content.text`.
- Receive: `NCEngine.addMessageHandler(id, new MessageHandler({ onMessageReceived({ messages }) {} }))`; `messages` is `Message[]` for all subscribed channels (filter by `message.channelIdentifier`/`channelId`).
- History: `BaseChannel.createMessagesQuery({ channelIdentifier: ch.identifier, startTime: Date.now(), pageSize: 20, isAscending: false })`, then `query.loadNextPage()` -> `RCResult<PageData<Message>>` with `data.data` as the message array. pageSize range 1-100. History is remote only (no web local store) and is scoped to the viewer's membership window: live-verified that a member sees messages sent while they were a member, but a user who joins later gets an empty page for earlier messages, even after many retries. There is no REST history endpoint for group channels. Open/community channel history needs paid cloud retention/Pro, so the app implements the sync/snapshot protocol instead.
- Disconnect: `await NCEngine.disconnect()`.
- Offline missed messages are stored 7 days by default and delivered after reconnect.
- Message text size: MAX_MESSAGE_CONTENT_BYTES = 131072 (128 KB). The app caps feedback at 500 chars and snapshots at 11 KB, far below the limit.
