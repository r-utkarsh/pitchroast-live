# Submission checklist

Everything in the project is ready. These are the steps only the human can do (accounts, deployment, recording, final submission).

1. **Create the GitHub repository and commit the project.**
   - Decide whether `AGENTS.md`, `SPEC.md` and the `phase-*.md` files should be public. If not, move them out of the repository before the first commit.
   - Confirm `.env` is not committed (it is git-ignored) and that no real App Secret appears in any file. Only `.env.example` with empty values belongs in the repo.
   - Suggested first commit: `PitchRoast Live — Nexconn Build Challenge 2026`.

2. **Deploy to Vercel.**
   - Import the repository as a Vite project.
   - Build command: `npm run build`; output directory: `dist`.
   - Set these four variables for Production, Preview and Development:
     - `NEXCONN_APP_KEY`
     - `NEXCONN_APP_SECRET`
     - `NEXCONN_REGION` (`singapore`, `north-america` or `saudi-arabia`)
     - `VITE_NEXCONN_APP_KEY` (same value as `NEXCONN_APP_KEY`)
   - Redeploy after saving the variables. `vercel.json` handles deep-link rewrites.

3. **Test the live URL on two devices.**
   - Create a room on desktop, copy the link, and open it on a phone with a second reviewer name.
   - Send a Fix from the phone and confirm it appears on desktop within a second or two.
   - Upvote it from desktop, toggle the vote off and on, and confirm both devices agree.
   - Click **Copy feedback as Markdown** and **Download .md**; open the downloaded file.
   - Check the invalid-link screen, the demo route and a hard refresh in a room.

4. **Fill the write-up placeholders and export the final PDF.**
   - In `submission/writeup.html`, replace exactly:
     - `[PASTE APP KEY]` with the public App Key only (never the App Secret)
     - `[PASTE LIVE URL]` with the deployed Vercel URL
     - `[PASTE GITHUB URL]` with the public repository URL
     - `[PASTE TRACTION PROOF]` with a real screenshot or result summary
   - Regenerate the PDF: `node scripts/render-writeup.mjs` (or print `writeup.html` to PDF from a browser).
   - Open `submission/writeup.pdf` and confirm every placeholder is replaced and no secret is visible.

5. **Record the 2-minute demo video.**
   - Follow `submission/demo-script.md` with two separate browser contexts.
   - Keep the room at **Live** on camera; do not record `.env`, tokens, the App Secret or the Nexconn console secret.
   - End on the exported Markdown or the mobile room.

6. **Collect traction proof.**
   - Invite real reviewers (friends, a community, a demo-day group) and ask them to leave at least one tagged note.
   - Screenshot the Nexconn console user count and/or a list of real `pr_` rooms.
   - Add the best proof to the write-up and keep the original image in `submission/`.

7. **Run the final local checks.**
   - `npm run verify`
   - `npm run test:e2e` (needs the real keys in `.env`)
   - `node scripts/check-no-secret.mjs`
   - Confirm no `node`/Vite/Express process from this project is still running.

8. **Submit every item before the deadline: Nov 22, 2026.**
   - Public repository URL
   - Live app URL
   - App Key (public key only)
   - `submission/writeup.pdf` (and `.html` if requested)
   - Demo video link
   - Traction proof
   - Screenshots in `submission/screenshots/` if the submission form asks for them
