# PHASE 4: Hardening, edge cases and full tests

Goal: the product is robust. Every edge case in SPEC section 6 is handled, and the complete test suite passes.

Rules from AGENTS.md apply. Do not ask anything. Do not start phase 5.

## Tasks
1. Go through SPEC section 6 line by line. For each item, check whether the app already handles it. Fix what is missing. Record any item you deliberately skip under KNOWN LIMITATIONS in STATUS.md with a reason.
   Pay particular attention to:
   - Connection banners and recovery: connect failure, token failure with backoff, token expiry or kicked status, offline and online.
   - Send failures, duplicate sends, cooldown, character limits, optimistic reconciliation.
   - Broken or tampered room links, unsafe URLs, oversized values.
   - Private-mode storage and clipboard fallbacks.
   - Server errors, missing env variables, invalid JSON, wrong method, oversized body, rate limit responses (429) shown as a friendly message in the UI.
2. Accessibility pass: labels on every input and button, visible focus rings, logical Tab order, aria-live for new messages and status changes, color contrast of tag chips, prefers-reduced-motion respected.
3. Security pass (SPEC section 7): check input validation on both sides, confirm the secret is not in the bundle (npm run build, then the secret check), confirm external links use rel="noopener noreferrer", search for dangerous APIs.
4. Complete the unit tests so every edge case that can be tested without a browser has a test.
5. Write the Playwright e2e suite (e2e/*.spec.ts), using real Nexconn keys from .env:
   - Create a room, second reviewer joins by link, a Fix message appears in both views in real time.
   - An upvote from the other reviewer updates the count in both views, and toggling it off works.
   - The tag filter and the "Top feedback" sort work.
   - The Markdown copy output contains the comment under the right heading.
   - A refresh keeps identity and history (if channel type A or B).
   - An invalid or tampered room link shows the friendly error page.
   - Mobile viewport 375x812: no horizontal scroll and the composer is usable.
   - Offline then online recovery (use Playwright's context offline setting).
   If keys are missing or Playwright browsers cannot be installed, skip live tests with a clear reason and mark them PENDING in STATUS.md.
6. Run "npm run verify" and "npm run test:e2e". Fix every failure by fixing the product, not by weakening a test. Only skip a test for the environment limits named above.
7. Search for leftover TODO comments, console.log of sensitive data, and unused code. Remove them.

## Exit gate
- npm run verify passes (typecheck, unit tests, build, secret check).
- npm run test:e2e passes against the real Nexconn service (or is documented PENDING with a reason).
- STATUS.md lists KNOWN LIMITATIONS and anything PENDING.

## Finish
Mark PHASE 4: DONE in PROGRESS.md, overwrite HANDOFF.md (test results, known limitations, what phase 5 starts with), print "PHASE 4 COMPLETE", and stop.
