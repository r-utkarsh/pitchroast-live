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

PHASE 3: PENDING

PHASE 4: PENDING

PHASE 5: PENDING
