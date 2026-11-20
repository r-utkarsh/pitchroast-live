# PitchRoast Live

Get roasted before you launch. PitchRoast Live is one link where reviewers leave tagged, upvotable feedback on a project pitch, and the builder exports the sharpest notes as a Markdown to-do list.

- **Hook** — is it catchy?
- **Clarity** — is it easy to understand?
- **Fix** — what should change?

Live chat runs on the **Nexconn Chat SDK**. There are no accounts, no databases, and no analytics.

## The problem

Builders share a project link in a group chat and get feedback scattered across replies, DMs and calls. Useful notes get buried, the same point is repeated, and nothing turns into a to-do list. PitchRoast Live puts the project and the review in one room, gives every note a shared tag, lets reviewers upvote the best points, and exports the result in a format a builder can act on.

## What you get

- **One-link rooms** — the project title, URL and pitch travel inside the share link. No sign-up, no database.
- **Live room** — project card on one side, live feedback on the other; works on desktop and phones.
- **Tagged feedback** — Hook, Clarity and Fix, with filters and a **Top feedback** sort.
- **Upvotes** — optimistic, last vote per reviewer wins, counts update in every open room.
- **Late-joiner backfill** — a reviewer who joins later asks an online member for a snapshot because Nexconn group history is membership-scoped.
- **Markdown export** — copy or download a to-do list grouped by tag, including votes and authors.
- **Optional 5-minute roast timer** — the room creator starts a round; it syncs to reviewers and locks the composer when it ends.
- **Resilience** — connection banners with Retry, token retry/backoff, offline/online recovery, send-failure Retry/Remove, storage-blocked fallback, friendly invalid-link pages.
- **Accessibility** — labelled fields, visible focus rings, `aria-pressed` votes, live-region status, AA contrast, reduced-motion aware scrolling.

## Tech stack

- React 18 + TypeScript (strict) + Vite 8
- Tailwind CSS 3
- react-router-dom 6
- Express 5 for the local API, thin Vercel functions in `api/` for production
- Nexconn Chat SDK `@nexconn/chat` / `@nexconn/engine` 26.2.1
- Vitest for unit tests, Playwright for live end-to-end tests

## How the Nexconn Chat SDK is used

1. The browser calls `NCEngine.initialize({ appKey, areaCode: AreaCode.SG })` once with the public App Key. Only this key reaches client code.
2. `POST /api/token` runs on the server with the App Key and App Secret, requests a Nexconn user token for the reviewer's generated `u_...` user ID, and returns only the token.
3. The browser connects the SDK with that token and joins a **group channel** named `pr_<roomId>` (a hyphen in a demo room ID becomes an underscore).
4. `POST /api/join` creates the group channel with the first reviewer as owner (or joins it if it already exists) so the SDK can join.
5. Every room event is a **text message containing compact JSON**: feedback, vote, timer, plus `sync`/`state` control messages for snapshot backfill. The app parses and validates every message; no HTML is ever rendered from chat.
6. Incoming messages arrive through the SDK message handler; earlier messages are loaded with the SDK's history API. A late joiner sends a `sync` request, and an online member replies with a `state` snapshot.
7. The app never uses Nexconn Chat UI components or the Call SDK, and never replaces chat with a custom websocket, polling or mock. The UI is custom React on top of the real SDK.

## Architecture

```text
Browser (React + Nexconn Chat SDK)
  │  POST /api/token  (user ID + name)
  │  POST /api/join   (user ID + room ID)
  ▼
Vercel functions / local Express (server/handlers/*)
  │  App Key + App Secret (server only)
  ▼
Nexconn Server API ── token, group-channel create/join

Browser A ──┐
Browser B ──┼── Nexconn group channel pr_<roomId>
Browser C ──┘     text messages: {"pr":1,"k":"fb"|"vote"|"timer"|"sync"|"state",...}

Room link: /r/<10-char-room-id>?d=<url-safe-base64 project payload>
```

The room ID and payload are validated before any connection is attempted. The payload is capped at 2 KB, room IDs are 10 base32 characters, and URLs must be `http`/`https`. The Nexconn channel ID is `pr_` + the room ID with `-` replaced by `_`, so demo rooms use `pr_demo_...`.

## Folder map

```text
api/                    Vercel function wrappers (token, join)
server/
  dev.ts                Local Express server on :8787
  env.ts                .env loading, region and credential checks
  nexconn.ts            Server API client (token, group create/join)
  http.ts               Body parsing, rate limits, response helpers
  handlers/             token.ts, join.ts
  *.test.ts             Server unit tests
src/
  main.tsx              Entry point; installs the storage shim before render
  App.tsx               Routes
  pages/                Landing, room, demo, broken link, 404, dev smoke
  components/           Header, status, shared UI, room cards/composer
  hooks/                useIdentity, useChatRoom
  lib/                  validation, protocol, reducer, digest, session,
                        cooldown, chat adapter, timer helpers
e2e/                    Playwright specs against real Nexconn
scripts/                Secret scan, live API check, screenshot capture
submission/             Screenshots, write-up, demo script, checklist
```

## Environment variables

Create `.env` from `.env.example`:

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXCONN_APP_KEY` | server | Nexconn App Key; used by `/api/token` and `/api/join` |
| `NEXCONN_APP_SECRET` | server | Nexconn App Secret; **never** exposed to the browser |
| `NEXCONN_REGION` | server | `singapore` (default), `north-america` or `saudi-arabia` |
| `VITE_NEXCONN_APP_KEY` | client | Public App Key used by the Chat SDK; falls back to `NEXCONN_APP_KEY` at build/dev time |
| `NEXCONN_API_BASE_URL` | server (optional) | Override the region's Server API base URL |

`.env`, `.env.local`, `dist`, logs and test artifacts are git-ignored. Never put the App Secret in a `VITE_` variable, a screenshot, a document or client code.

## Run locally

Requires Node 20+ (verified on Node 24).

```bash
npm install
cp .env.example .env      # then fill in the two Nexconn keys
npm run dev
```

- Web app: http://localhost:5173
- Local API: http://localhost:8787
- Demo: http://localhost:5173/demo

Vite proxies `/api` to the local Express server. To try the real flow, open the room link in a second browser profile or a private window, join with another name, and send tagged feedback.

## Tests

```bash
npm run typecheck     # strict TypeScript
npm test              # Vitest: 77 tests across 10 files
npm run build         # production bundle
npm run check-secret  # scans dist/ for the App Secret
npm run verify        # typecheck + tests + build + secret scan
npm run test:e2e      # Playwright against real Nexconn (needs .env)
```

The Playwright suite starts the dev servers itself, creates real `pr_` rooms and `u_` users, and covers two reviewers, a late joiner, upvotes, filters, Top sort, Markdown copy/download, refresh, mobile layouts, blocked storage, token rate limiting, offline/online recovery and invalid links. Test data is prefixed `pr_` and is safe to leave.

`npm run test:e2e` needs the real keys in `.env`; without them the live tests cannot connect.

## Deploy to Vercel

1. Push the repository to GitHub and import it into Vercel as a Vite project.
2. Build command: `npm run build`; output directory: `dist`. The functions in `api/` are detected automatically.
3. Set these environment variables for Production, Preview and Development:
   - `NEXCONN_APP_KEY`
   - `NEXCONN_APP_SECRET`
   - `NEXCONN_REGION` (`singapore`, `north-america` or `saudi-arabia`)
   - `VITE_NEXCONN_APP_KEY` (same value as `NEXCONN_APP_KEY`)
4. Redeploy after adding the variables. `vercel.json` rewrites all non-API paths to `index.html`, so deep room links work.
5. Test the live URL on two devices: create a room, open the link on a phone, join, send a Fix, upvote it on the other device, and export the Markdown.

Vercel compiles the `api/` functions to CommonJS, where the extensionless server imports resolve correctly. `api/tsconfig.json` forces Node16/CommonJS for the function build; keep it. Do not add `"type": "module"` to `package.json` unless you also add explicit `.js` extensions to every relative import in `api/` and `server/`; otherwise the functions crash at startup with `FUNCTION_INVOCATION_FAILED` / `ERR_MODULE_NOT_FOUND`. The Vite configs use `.mts` so they stay ESM without setting a package-wide module type.

If the SDK and the Server API need different regions, change `AreaCode.SG` in `src/lib/chat.ts` as well as `NEXCONN_REGION`.

## Limitations

- **Late-joiner history** is membership-scoped in Nexconn group channels. The sync/snapshot handshake fills the gap while at least one earlier member is online. If every earlier member is offline, a late joiner sees an empty room until a new event arrives.
- **Snapshots** are capped at roughly 11 KB and the newest 200 feedback items; very large rooms are truncated (`tr` flag).
- **In-memory rate limits** (20 requests/minute per IP) are per server instance; they are best-effort on serverless.
- **Cooldown** (5 human sends per 10 seconds) is per adapter instance in the browser; a reload resets it.
- **Demo rooms** open empty with the sample project. `/api/seed-demo` was intentionally skipped because the implemented Server API surface does not send chat messages.
- **Blocked browser storage** uses an in-memory shim, so the room works for that page load but identity and recent rooms are lost on reload.
- **Browser support**: automated tests run in Chromium only; Firefox, Safari and Edge need a manual pass.
- **Bundle size** is about 1.2 MB (275 KB gzip) because the Nexconn SDK ships as one chunk.
- Test rooms and users created by the live suite remain in the Nexconn app, prefixed `pr_`/`u_`.

## License

No license has been chosen yet. The project owner should add the license that fits their plans before publishing the repository.
