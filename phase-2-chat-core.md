# PHASE 2: Chat core (protocol, reducer, adapter, unit tests)

Goal: all non-UI logic works and is tested, and the Nexconn adapter is proven with a real two-user message exchange.

Rules from AGENTS.md apply. Do not ask anything. Do not start phase 3.

## Tasks
1. Shared logic (pure TypeScript, no React) in src/lib:
   - validation.ts: room payload encode, decode and validate; URL normalization and scheme check; display-name validation; userId and roomId generation and validation; length limits from SPEC section 5.
   - protocol.ts: build and parse feedback, vote and timer events (SPEC section 5). Strict parsing, ignore malformed and unknown messages.
   - reducer.ts: turn an ordered event list into state (feedback list, vote counts, voters per feedback, reviewer list). Dedupe by id, last vote per (target, voter) wins, votes may arrive before their target.
   - digest.ts: produce the Markdown digest in the exact structure from SPEC section 5.
   - session.ts: identity storage with try/catch and in-memory fallback (sessionStorage for userId and name, localStorage for the last name and recent rooms).
2. src/lib/chat.ts: the Nexconn ChatAdapter (connect with a token fetched from /api/token with retry and backoff, join through /api/join if needed, send, load history, onMessage, onStatus, disconnect). It maps Nexconn connection states to a small status type: connecting, connected, reconnecting, disconnected, kicked, failed. All Nexconn SDK calls stay inside this file.
3. Unit tests (Vitest) for every module in task 1 and for the client send cooldown helper (max 5 messages per 10 seconds). Include malformed, oversized, unsafe-URL, unknown-version, duplicate, out-of-order and vote-before-target cases.
4. Live adapter check. Add a dev-only page at /__smoke (rendered only when import.meta.env.DEV is true) with a minimal connect, join, send and message list using the adapter. Write e2e/smoke.spec.ts (Playwright, two browser contexts): both connect with different users to a fresh room "smoke_<random>", user A sends a feedback event, user B receives it within 5 seconds, and a third fresh page joining later loads history (if channel type A or B).
5. If keys are missing or Playwright cannot run, mark the live check PENDING in STATUS.md and continue. If the adapter fails live, diagnose using the error text and the Nexconn facts in DECISIONS.md, and use the blocker ladder (SPEC section 4, channel type fallbacks).

## Exit gate
- npm run typecheck, npm test and npm run build pass.
- The smoke e2e test passes against the real Nexconn service (or is documented PENDING with a reason).
- The adapter exposes the interface from SPEC section 4 and no SDK call exists outside src/lib/chat.ts (check by searching the source).

## Finish
Mark PHASE 2: DONE in PROGRESS.md, overwrite HANDOFF.md (module map, the adapter interface, test commands, gotchas), print "PHASE 2 COMPLETE", and stop.
