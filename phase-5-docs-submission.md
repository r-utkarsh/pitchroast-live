# PHASE 5: Stretch, docs and submission assets

Goal: finish the product with a few quick extras, write all documentation, and produce every asset the human needs to submit. At the end the project is complete.

Rules from AGENTS.md apply. Do not ask anything.

## Tasks

### A. Optional demo seeding (only if the server API can send messages)
Implement POST /api/seed-demo (SPEC section 5) and call it once when a /demo room is created, so judges see sample tagged feedback immediately. If the server API cannot send messages, skip this and note it in DECISIONS.md. Re-run "npm run verify" afterwards.

### B. Stretch features (in this order; each only if quick and low-risk; re-run verify after each)
1. A 5-minute roast timer started by the room creator, synced through the timer event. When it ends, show a clear "Roast ended" state and lock the composer. The creator can start a new round.
2. Online reviewer count through presence, only if the SDK supports it simply. Otherwise show the number of distinct reviewers seen in the room.
3. Small polish: short toasts, keyboard shortcuts (for example "/" focuses the composer).
Skip anything that risks core behavior. Do not spend long on stretch work.

### C. Documentation and submission assets
1. README.md: what it is and the problem it solves, features, tech stack, how the Nexconn Chat SDK is used, a text architecture diagram, folder map, environment variables, run locally, run tests, deploy to Vercel (set NEXCONN_APP_KEY, NEXCONN_APP_SECRET, NEXCONN_REGION and VITE_NEXCONN_APP_KEY in the Vercel project settings, redeploy, test with two phones), limitations, and a note that the license is the owner's choice.
2. Screenshots with Playwright into submission/screenshots: landing, room with feedback (create the content by driving two contexts), mobile room, Markdown export. Sizes 1280x800 and 375x812.
3. submission/writeup.html and submission/writeup.pdf (print the HTML to PDF with Playwright page.pdf; if that fails keep the HTML and also write submission/writeup.md). Sections: project name, track (Open Innovation), problem, solution, target users, how it uses the Nexconn Chat SDK, architecture, screenshots, how judges can test it in 60 seconds, growth path (how it could become a product and gain real users). Use these exact placeholders: [PASTE APP KEY], [PASTE LIVE URL], [PASTE GITHUB URL], [PASTE TRACTION PROOF]. Never insert the secret, and do not insert the real App Key either.
4. submission/demo-script.md: a 2-minute demo video script with timings, exact clicks and narration lines. Show: landing, create a room, share the link, second reviewer joins in another tab, tagged feedback, upvote, Markdown export, mobile view.
5. submission/CHECKLIST.md: the numbered list of what the human must do after you finish: create the GitHub repo and commit (consider removing or moving AGENTS.md, SPEC.md and the phases folder first, if they should not be public); deploy to Vercel and set the four environment variables; test the live URL on two devices; fill the placeholders in the write-up and export the final PDF; record the video; collect traction proof (invite real users, screenshot the Nexconn console user count); submit all items before the deadline of Nov 22, 2026.
6. Run "npm audit --omit=dev" once. Fix only critical or high issues that have a simple fix. List the rest in STATUS.md.

### D. Final verification and report
1. Run "npm run verify" and "npm run test:e2e" one last time. Fix failures.
2. Confirm no secret appears anywhere in the project folder or dist (search without printing the value).
3. Confirm no process is left running.
4. Write FINAL_REPORT.md: a short summary, the folder tree, all commands, what changed from the plan and why, what was verified live and what is PENDING, KNOWN LIMITATIONS, and the first three things the human should do next.

## Exit gate (Definition of Done)
- The app runs locally with "npm run dev"; the production build passes; a reviewer in tab B sees what tab A sends within a second or two and can upvote; the Markdown export works; invalid links and connection errors show friendly screens.
- npm run verify passes; the e2e suite passes (or is PENDING only for an environment limit).
- No secret in the repo or bundle.
- README.md, the submission folder (write-up, screenshots, demo script, checklist), STATUS.md and FINAL_REPORT.md exist.

## Finish
Mark PHASE 5: DONE in PROGRESS.md, overwrite HANDOFF.md, and print a concise final message: what was built, how to run it, what is verified, what is pending, and the path to submission/CHECKLIST.md. Do not ask any question. Do not offer further options. Stop.
