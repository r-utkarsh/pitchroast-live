# SPEC.md: PitchRoast Live

## 1. Product
PitchRoast Live is a web app where a builder shares a project link and gets structured live feedback from reviewers in a chat room. One screen: a project card on one side, a live chat on the other. Every comment carries a tag: Hook (is it catchy?), Clarity (is it easy to understand?) or Fix (what should change?). Reviewers can upvote the best comments. The owner can copy all feedback as a Markdown to-do list.

Chat runs on the Nexconn Chat SDK (mandatory). Do NOT use Nexconn Chat UI components or the Call SDK. Build the UI yourself.

Judging weights to optimize for: 50% completeness and ease of use (it must work start to finish and be obvious with no instructions), 30% innovation and a real communication problem, 20% business and growth potential (real users, a path to a product).

## 2. Fixed tech stack
- React 18 + TypeScript (strict) + Vite, Tailwind CSS 3.x, react-router-dom v6.
- Backend: Vercel-style serverless functions in the /api folder (Node runtime, TypeScript). Put all logic in server/handlers/*.ts and keep /api/*.ts as thin wrappers. The same handlers also run in a local Express dev server (server/dev.ts, port 8787). The Vite dev server proxies /api to it. "npm run dev" starts both. The app must run locally with NO Vercel login.
- Package manager: npm. Use the installed Node version (run node -v first). Pin exact dependency versions after install.
- Tests: Vitest (unit), Playwright with Chromium (end-to-end).
- vercel.json rewrites every non-/api path to /index.html, for example source "/((?!api/).*)" and destination "/index.html".
- No database or external storage service. Room details travel inside the room link. All chat history lives in Nexconn.
- package.json scripts: dev, build, typecheck, test (vitest run), test:e2e (playwright test), check-secret, verify (typecheck + test + build + check-secret).

## 3. Environment variables
Read the project-root file .env (also accept .env.local).
- NEXCONN_APP_KEY (required), NEXCONN_APP_SECRET (required, server only).
- VITE_NEXCONN_APP_KEY (optional). If missing, derive it from NEXCONN_APP_KEY with Vite's define option (use loadEnv in vite.config.ts and define import.meta.env.VITE_NEXCONN_APP_KEY). NEVER set Vite envPrefix in a way that exposes the secret.
- NEXCONN_REGION, default singapore. The user's Nexconn app is in the Singapore data center. Find out from the Nexconn docs or SDK how region or data center is configured (API base URL, navigation or connection URL) and configure client and server for Singapore. Allow optional overrides NEXCONN_API_BASE_URL and NEXCONN_NAV_URL if the docs show such settings.
- Provide .env.example with names and empty values. If .env is missing or incomplete, do NOT stop: build everything, mark live-verification tasks PENDING in STATUS.md, skip live tests with a clear reason, and continue.
- scripts/check-no-secret.mjs: after the build, read the secret from the environment, search the dist folder for it, and fail if found. Never print the secret.

## 4. Nexconn integration: discover, do not guess
Package and API names in these notes came from secondary sources and may be wrong. Verify everything yourself.
1. If you have internet access: search the web for the Nexconn Chat SDK for Web documentation, check the GitHub organization NexconnAI-Dev (including any official coding-assistant skill), and use "npm view <name>" to confirm which packages exist. Likely candidates: a web client package such as @nexconn/chat (and possibly @nexconn/engine) and a Node server SDK or a REST server API. If you have no internet beyond npm, install the packages and read their README and TypeScript declaration files in node_modules.
2. Establish the following and write it in DECISIONS.md under "Nexconn facts": how to init the client with the App Key and region; how to register a user and mint a token on the server with the App Secret; how to connect with the token; how to create or join a channel; how to send and receive a message in real time; how to fetch message history; connection status listeners; how to disconnect; any size, rate or ID-format limits.
3. Channel choice, in order of preference: (A) a group channel that the server creates and the user is added to through a server call, with history for late joiners; (B) an open channel or chatroom with history retrieval; (C) an open channel without history (document the limitation; votes then count only live). Use the first that works and log why.
4. Message format: use a custom message type if the SDK makes that simple. Otherwise send a text message whose content is the JSON string. Put ALL of this in src/lib/protocol.ts. Put ALL SDK calls in src/lib/chat.ts, exposing a small ChatAdapter interface (connect, join, send, history, onMessage, onStatus, disconnect). The rest of the app only talks to the adapter. An in-memory fake adapter may be used in unit tests only, never in the shipped app.
5. If a call fails, read the error, fix the cause (wrong region, token expiry, user ID format, channel ID format), and retry. Limit identifiers to lowercase letters, digits and underscores, at most 32 characters.

## 5. Functional spec

### Routes
- /  landing page: headline, one-line explanation, a "Create a roast room" form, a "Try the demo" button, and a "Recent rooms" list (from localStorage, max 5, safe if storage is unavailable).
- /r/:roomId?d=<payload>  the room.
- /demo  creates a fresh demo room (new random roomId starting with demo-) with a built-in sample project, then redirects to it.
- anything else: a friendly 404 page with a link home.

### Room payload
d = base64url(JSON {v:1, t:title, u:url, p:pitch, c:createdAtMs}).
Limits: title 1-80 chars, pitch 1-140 chars, url up to 300 chars, http or https only (reject javascript:, data: and similar; add https:// if the scheme is missing). roomId is 10 random lowercase base32 characters from crypto.getRandomValues. Channel or group ID is "pr_" + roomId. Validate the payload when creating and when loading. If it is invalid, tampered, too long or an unknown version, show a friendly error page ("This room link looks broken") with a button home. Never crash.

### Identity
No accounts. On first entry ask for a display name (2-24 chars, trimmed, repeated spaces collapsed, whitespace-only rejected). Generate userId = "u_" + 16 random hex characters. Store {userId, name} in sessionStorage, so each browser tab is a separate reviewer and a judge can test alone with two tabs. Remember only the last name in localStorage to prefill the form. Wrap all storage access in try/catch with an in-memory fallback (private mode safe). The room has an "Open as another reviewer" button that opens the same room link in a new tab.

### Server endpoints
JSON in, JSON out, error shape {error:"message"}.
- POST /api/token {userId, name}: registers or updates the user and returns a token. Validate userId with a strict regex and the name length. Never return the secret.
- POST /api/join {userId, roomId}: ensures the channel exists and the user is a member (only if the chosen channel type needs it). Validate the roomId format.
- POST /api/seed-demo {roomId} (OPTIONAL, only if the server API can send messages): only for roomIds starting with "demo-". Sends about 6 sample tagged messages and a few votes from 3 fictional reviewers, once per room. If the server API cannot send messages, skip it and note that in DECISIONS.md.
- Rate limiting: in-memory sliding window per IP (first value of x-forwarded-for), 20 requests per minute per endpoint, answer 429 with a retry hint. Note in the README that this is best-effort on serverless.
- Only POST is allowed (405 otherwise). Limit request body size to about 2 KB. No CORS headers (same origin).

### Message protocol (src/lib/protocol.ts)
Every message carries pr:1. Parse strictly; ignore unknown or malformed messages.
- Feedback: {pr:1, k:"fb", id:<client-generated 16 hex>, tag:"hook"|"clarity"|"fix", text:<1-500 chars>}
- Vote: {pr:1, k:"vote", target:<feedback id>, on:true|false}. The voter is the message sender. The last vote event per (target, voter) wins. Users may toggle their upvote. Self-upvote is allowed.
- Timer (stretch): {pr:1, k:"timer", startAt, durSec}
- Reducer: build state from an ordered event list. Deduplicate feedback by id (history and live events can overlap). Keep votes for unknown targets and apply them when the target appears.

### Room screen
- Project card: title, pitch, a prominent "Open live project" button (new tab, rel="noopener noreferrer", never an iframe), "Copy room link", "Open as another reviewer", "Copy feedback as Markdown", "Download .md".
- Feedback list in chronological order. Each item: author name, time, colored tag chip, text, upvote button with count.
- Composer: three tag chips (Hook, Clarity, Fix; exactly one selected, default Hook), a text input and a send button. Enter sends, Shift+Enter inserts a newline, live character counter (500), disabled while sending or when empty.
- Top bar: app name (link home) and a connection status indicator.
- Tag filter chips (All, Hook, Clarity, Fix) and a "Top feedback" sort toggle (by upvotes).
- Layout: card left and chat right on desktop; card on top (collapsible) and chat below on mobile.

### Markdown digest (copy and download), exact structure
    # PitchRoast feedback: <title>
    <pitch>  Link: <url>
    Collected: <date> | <N> comments | <M> reviewers
    ## Fix (<n>)
    - [ ] <text> (+<votes>) by <name>
    ## Clarity (<n>)
    ...
    ## Hook (<n>)
    ...
Within each section sort by votes (desc), then time. Skip empty sections. "Copy" uses navigator.clipboard with a fallback to a hidden textarea and execCommand. Show "Copied!" for 2 seconds.

## 6. Edge cases (handle all; test where practical)
- Connection: SDK fails to connect (banner + "Retry"); token request fails (exponential backoff, 3 tries, then a clear error with Retry); token expiry or kicked status (refetch a token and reconnect once, then show an error); browser goes offline and online (show "Reconnecting..." and recover automatically).
- Sending: send fails (show "Failed to send" with Retry and Remove); double click or double Enter must not send twice; empty or whitespace-only text blocked; over 500 chars blocked; client cooldown (max 5 messages per 10 seconds, with a friendly "Slow down" note); optimistic message shown immediately and reconciled with the real one using the id field, without duplicates.
- History: loads on join; late joiners see earlier messages; refresh restores identity and history; if history is unavailable (channel type C), show a small note "Earlier messages are not available".
- Display: React escapes all text (never use dangerouslySetInnerHTML; no auto-linking); preserve line breaks; long words wrap; emoji and RTL text render properly; auto-scroll only if the user is near the bottom, otherwise show a "New messages" pill; empty state ("No feedback yet. Be the first to roast."); loading skeleton; timestamps in local time.
- Links: invalid or missing payload; tampered payload; oversized URL; unsafe URL scheme; a valid payload with an empty channel is simply an empty room; browser back and forward; deep link opened directly (needs the vercel.json rewrite).
- Browser: storage unavailable; clipboard unavailable; 320px-wide screens; keyboard-only use (visible focus rings, labels, aria attributes, logical Tab order); reduced-motion preference respected; current Chrome, Edge, Firefox and Safari.
- Server: missing env variables (generic 500; log a safe message that names the variable, never a value); invalid JSON; wrong method; oversized body; Nexconn API errors (friendly generic message; log details without secrets); never crash the process.

## 7. Security checklist
Input validation on client and server; secret only on the server and never in the bundle; no eval and no innerHTML; external links use rel="noopener noreferrer"; URLs are http or https only; error messages never reveal internals; no sensitive data in localStorage; minimal dependencies; run "npm audit --omit=dev" once at the end and fix only critical or high issues that have a simple fix (list the rest in STATUS.md).

## 8. Design (default; the user will restyle later)
Clean modern dark theme. Near-black navy background, slightly lighter surface cards, one accent color (indigo or blue). Tag colors: Hook amber, Clarity sky blue, Fix rose, each with WCAG AA text contrast. System font stack, generous spacing, rounded corners, subtle borders, no heavy animation. Centralize colors, spacing and tag styles in tailwind.config and one shared UI layer (for example src/components/ui) so the user can restyle quickly. Include a favicon, a page title and a meta description. English only. Mobile-first and responsive.
