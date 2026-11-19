# Handoff

Phase 2 complete. Next session runs phase 3 only.

## Done
- All non-UI logic in `src/lib`, unit-tested (56 tests, 7 files).
- The Nexconn adapter is live-proven: real token, real group join, real send, real-time receive, real history, and a three-context Playwright smoke test.
- Late joiners are handled with an app-level sync/snapshot handshake because Nexconn group history only covers the viewer's membership window.
- `npm run verify` (typecheck, tests, build, secret scan) and `npm run test:e2e` both pass.

## Module map
- `src/lib/validation.ts`: SPEC limits, text length, `LIMITS`, `USER_ID_RE` (`u_` + 16 hex), `ROOM_ID_RE` (10 base32, optional `demo-`), `FEEDBACK_ID_RE`, name/title/pitch/URL normalization (`http`/`https` only), room ID generators, `channelIdForRoom`, `buildRoomPath`, room payload `createRoomPayload` / `validateRoomPayload` / `encodeRoomPayload` / `decodeRoomPayload`.
- `src/lib/protocol.ts`: `FeedbackEvent`, `VoteEvent`, `TimerEvent`, plus control events `SyncEvent` (`k: 'sync'`) and `StateEvent` (`k: 'state'`) for backfill. Builders (`buildFeedback`, `buildVote`, `buildTimer`, `buildSyncRequest`), strict `parseRoomEvent` (accepts JSON string or object), `serializeEvent`.
- `src/lib/reducer.ts`: `RoomState` = feedback, votes (`target -> voter -> on`), reviewers, timer. `applyEvent`, `reduceEvents`, `voteCount`, `hasVoted`, `reviewerCount`, `buildSnapshot(state, now?)`. Dedupe by feedback id, chronological order, last vote per (target, voter) wins, votes before targets kept, reviewer names upgraded.
- `src/lib/digest.ts`: `buildDigest({ title, pitch, url, state, date })` and `formatCollected(date)`; exact SPEC Markdown: summary, votes-desc then time, sections Fix / Clarity / Hook, empty sections skipped.
- `src/lib/session.ts`: sessionStorage identity (`u_...` + name), localStorage last name and recent rooms (max 5), safe try/catch with in-memory fallback, `__resetStorageForTests`.
- `src/lib/cooldown.ts`: `takeSendSlot(timestamps, now, 5, 10_000)`; returns `allowed` or `retryAfterMs`.
- `src/lib/chat.ts`: the ONLY file that imports `@nexconn/*`. Contains `ChatError`, `ChatIdentity`, `ChatMessage`, `ChatStatus`, `createChatAdapter`.
- `src/pages/SmokePage.tsx`: dev-only `/__smoke?room=<id>&name=<name>` page. It wires the adapter, reduces events, sends a sync request after joining, and answers sync with a snapshot.
- `e2e/smoke.spec.ts`: three Chromium contexts. A + B join a fresh `smoke` room, A sends, B receives live, C joins later and receives the earlier message through the snapshot.

## Adapter interface
```ts
export interface ChatAdapter {
  connect(identity: { userId: string; name: string }): Promise<void>;
  join(roomId: string): Promise<void>;
  send(event: RoomEvent): Promise<ChatMessage>;
  history(pageSize?: number): Promise<ChatMessage[]>;
  onMessage(handler: (message: ChatMessage) => void): Unsubscribe;
  onStatus(handler: (status: ChatStatus) => void): Unsubscribe;
  disconnect(): Promise<void>;
}

export interface ChatMessage {
  id: string;          // Nexconn messageId, stable across history and live
  senderId: string;
  senderName: string;  // profile / cache / "Reviewer"
  text: string;        // raw JSON; parse with parseRoomEvent
  sentAt: number;
  isMine: boolean;
}

export type ChatStatus =
  | 'idle' | 'connecting' | 'connected' | 'reconnecting'
  | 'disconnected' | 'kicked' | 'failed';
```
Behavior: token is fetched from `/api/token` (3 attempts, 400/800 ms backoff); SDK init once with `NCEngine.initialize({ appKey: VITE_NEXCONN_APP_KEY, areaCode: AreaCode.SG })`; `join` calls `/api/join` then `new GroupChannel(channelId)`; `send` validates the event, applies the human cooldown, sends a text message; `history` pages up to 5 x 100 messages, resolves names, sorts ascending, retries once after 600 ms if empty; status handlers are removed on `disconnect`.

## Backfill handshake (important for phase 3)
Nexconn group history is scoped to the membership window, so a new joiner must not trust an empty history. The flow proven in `SmokePage`:
1. After `history()` and ready, the joiner sends `buildSyncRequest()`.
2. Every other online member with state replies (debounced ~150-450 ms) with `buildSnapshot(state)`.
3. `applyEvent` merges the snapshot: adds unknown feedback, keeps existing items, merges votes, keeps the later timer.
Move this handshake into the real room UI/hook in phase 3. Without it, only attendees who were already connected see earlier feedback.

## Commands that work
- `npm run dev` -> Vite http://localhost:5173 + API http://localhost:8787. Background it, redirect logs, stop it afterwards.
- `npm run typecheck`, `npm run test`, `npm run build`, `npm run check-secret`, `npm run verify`.
- `npm run test:e2e` -> Playwright starts `npm run dev` itself; 1 test, 3 contexts, ~15 s.
- `node scripts/live-check.mjs` while the dev server is up (local API smoke, prints no tokens).
- `npx playwright install chromium` if the browser cache is ever missing.

## Gotchas
- `.env` holds the real Singapore keys. Never cat it or print values. Only `VITE_NEXCONN_APP_KEY` reaches the client. `src/` must never import `server/` or `api/`.
- The App Secret is server-only; `check-no-secret` scans `dist/`. Do not add logging of tokens or headers.
- Nexconn history is membership-scoped and there is no group REST history endpoint. An empty late-joiner history is expected, not an error. Open/community history needs paid tiers.
- Query shape: `BaseChannel.createMessagesQuery({ channelIdentifier, pageSize (1-100), startTime: Date.now(), isAscending: false })`, `loadNextPage()` -> `data.data`. Up to 5 pages are read.
- Text messages carry JSON. `MAX_MESSAGE_CONTENT_BYTES` is 131072; snapshots are capped at 11 KB / 200 items to stay far below it.
- Cooldown applies only to `fb`/`vote`/`timer`, not to `sync`/`state`; control messages are still protocol-validated.
- Connection status codes: 0 CONNECTED, 1 CONNECTING, 2 DISCONNECTED, 3 SUSPENDED; kicked code 31010 -> status `kicked`.
- `NCEngine.disconnect()` is global to the page. One adapter per app lifecycle; handlers are registered with unique IDs and removed on disconnect.
- A send can take a moment to appear in remote history; `history()` retries once when empty. Live delivery is immediate.
- Room IDs are 10 base32 chars (`a-z2-7`), demo rooms `demo-` + 10; channel ID is `pr_` + roomId with `-` -> `_`.
- Playwright's `webServer` stops the dev servers, but check ports 5173/8787 at the end of the session anyway.
- No write git commands. Do not edit AGENTS.md, SPEC.md or the phase files.

## Next phase starts with
Phase 3 (UI): read `phase-3-ui.md`, build the real routes/screens on top of these modules, move the sync/snapshot handshake from `SmokePage` into the room flow, use `buildDigest` for the collected-feedback view, keep every SDK call inside `src/lib/chat.ts`, then run `npm run verify` and `npm run test:e2e`.
