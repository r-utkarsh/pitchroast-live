# PHASE 3: User interface (landing, create room, room screen)

Goal: a complete, usable product flow in the browser, built on the adapter and logic from phase 2: create a room, share the link, chat with tags, upvote, filter, export.

Rules from AGENTS.md apply. Do not ask anything. Do not start phase 4.

## Tasks
1. Theme and shared UI (SPEC section 8): tailwind.config colors and tag styles, a small shared UI layer (Button, Chip, Card, Input, Banner, Toast or inline notice), favicon, page title, meta description.
2. Router and pages (SPEC section 5):
   - Landing page: headline, one-line explanation, create-room form (title, project URL, one-line pitch, with inline validation and character counters), "Try the demo" button, "Recent rooms" list.
   - Create flow: validate, build the payload and roomId, navigate to /r/:roomId?d=<payload>.
   - /demo: create a fresh demo room with a built-in sample project and redirect.
   - Error pages: broken room link, 404.
3. Room page:
   - Name gate: if there is no identity in session storage, show a name form before connecting. Prefill with the last used name.
   - Hooks: useIdentity (session.ts) and useChatRoom (wraps the adapter and the reducer; exposes events state, status, send, retry, removeFailed, history-available flag).
   - Project card, feedback list, composer with tag chips, upvote buttons, tag filter chips, "Top feedback" sort toggle, connection status indicator, "Copy room link", "Open as another reviewer", "Copy feedback as Markdown", "Download .md". Behavior exactly as in SPEC section 5.
   - Optimistic sending reconciled by the feedback id, a failed-send state with Retry and Remove, a client cooldown, auto-scroll only near the bottom with a "New messages" pill, empty and loading states.
4. Make the layout responsive: desktop two columns, mobile stacked with a collapsible card. Check at 375px and 1280px.
5. Run a quick browser check with Playwright (a short script or test): create a room, open it in two contexts with different names, send a feedback message, confirm the other context sees it, upvote it, confirm the count updates in both, and confirm the Markdown export contains the text. If live checks cannot run, mark PENDING in STATUS.md.
6. Fix every bug found in the check. Remove the /__smoke page from production builds (keep it dev-only).

## Exit gate
- npm run typecheck, npm test and npm run build pass.
- The full flow works in the quick browser check (or PENDING with a reason): landing, create, share link, two reviewers chatting, tags, upvote, filter, export, demo route.
- No horizontal scroll at 375px width.
- No use of dangerouslySetInnerHTML, innerHTML or eval anywhere (search the source).

## Finish
Mark PHASE 3: DONE in PROGRESS.md, overwrite HANDOFF.md (component map, flows, test commands, gotchas), print "PHASE 3 COMPLETE", and stop.
