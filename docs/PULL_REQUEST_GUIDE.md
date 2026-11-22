# Framing Lab v2 — Four ready-to-apply GitHub pull requests

## IMPORTANT

These are **local, reviewable patch sets** prepared against the exact previously delivered Oner × Rhode Framing Lab starter HTML and README. They have **not** been pushed to your GitHub repository. You need to create the branches and PRs yourself, or connect GitHub with an authorized app. If you changed the live files after that starter, patches might not apply cleanly; compare files or use the cumulative snapshots.

Each PR should be branched from **updated `main` after the previous PR has been merged**, not from the original main, unless you intentionally create stacked PRs.

## Download contents

- `framing-lab-v2-final.zip`: complete final project after all four PRs, with frontend, Worker, Apps Script, research docs, tests.
- `PR-01-changed-files.zip` … `PR-04-changed-files.zip`: only the files changed by that PR; useful for a graphical GitHub upload.
- `PR-01-full-snapshot.zip` … `PR-04-full-snapshot.zip`: cumulative repository state for comparison or recovery.
- `patches/01-data-integrity.patch` … `patches/04-methodology.patch`: exact git diff patches, intended to apply sequentially.

## 1 — `feature/framing-v2-01-data-integrity`

**Title:** `feat: introduce verified v2 collection and preserved v1 data`

**Why:** v1 can show success even without confirming a spreadsheet save. V2 requires server authoritative assignment, immutable answers, dedupe and a readable storage acknowledgement.

**What changes:** Apps Script, Worker CORS bridge, Worker config, backend tests, and a prospective `docs/RESEARCH_PROTOCOL.md` to fill **before** v2 begins. V1 frontend is unchanged by this PR.

**Acceptance:** `npm test` passes; v1 `Responses` sheet still accepts v1 data; v2 assign/submit/save endpoints work after separately deploying Apps Script and Worker; v2 data is written only to new V2 tabs.

**Deployment gate:** Back up existing Apps Script and Google Sheet; deploy Apps Script **new version** and Cloudflare Worker. Set `wrangler.toml` exact GitHub Pages origin and `APPS_SCRIPT_URL` secret. **Fill and commit study start/end dates before activating PR 02.** No production frontend change until API is ready.

## 2 — `feature/framing-v2-02-participant-experience`

**Title:** `feat: neutral shopping task and evidence-backed reveal`

**Why:** pre-response language revealed the study purpose and generic debrief gave little participant payoff.

**What changes:** Replaces root HTML content while retaining original styling cues and bottle art; external style/app JS; adds `config.js` Worker origin. Server confirms save before completion. `?demo=1` is safe preview with both conditions.

**Acceptance:** Both arms show identical content except price; first page does not reveal two-arm setup; submitting fails visibly if API fails; submitted v2 answer appears in `V2_Responses` exactly once.

**Deployment gate:** Edit `config.js` to your actual Cloudflare Worker URL **before merging**. `PASTE_YOUR_WORKER_URL_HERE` deliberately disables live submissions.

## 3 — `feature/framing-v2-03-results`

**Title:** `feat: gated results, distributions and evidence limits`

**Why:** A research product should show findings, but revealing outcomes while collecting biases future observations and tiny groups threaten disclosure.

**What changes:** `results.html`, `assets/results.js`, backend threshold tests and interpretation. During collection displays status and counts but no WTP group outcomes. After study closed and minimum 20 each, shows real aggregates.

**Acceptance:** Active study hides group WTP, completed study publishes only above threshold, chart is based on actual API values, never dummy data.

**Deployment gate:** Do **not** close the study to obtain attractive results; follow the protocol stopping date.

## 4 — `feature/framing-v2-04-research-case-study`

**Title:** `docs: methodology, analysis plan and reproducible research case study`

**Why:** Makes product-management and scientific decisions inspectable instead of showcasing an HTML page alone.

**What changes:** Public methodology page, owner-side CSV analysis CLI, finalized study documentation (protocol was introduced in PR 01), GitHub Action tests and gitignore.

**Acceptance:** Protocol has a recorded start/end date before collecting new v2 responses, all tests pass, real data is never committed to GitHub.

## Option A — GitHub website (no command line)

For each PR, after the previous one is merged:

1. Go to your GitHub `framing-lab` repository > **Code**.
2. Open the branch selector (`main`) and type the new branch name above; click **Create branch: ... from main**.
3. Unzip that PR's **changed-files ZIP**. Use **Add file → Upload files** to upload the changed folders/files while preserving their paths; replace existing files on that branch. GitHub's web UI might require individual file edits or a desktop Git client to preserve nested folders.
4. Commit to the **feature branch**, not directly to `main`.
5. Click **Compare & pull request**, verify **base: main** and **compare: your feature branch**, copy the PR title/description above, and create the PR.
6. Review the **Files changed** tab and tests. Merge the PR. Repeat using the new updated `main`.

Because PRs 1–4 contain nested folders, using GitHub Desktop or the command line below is more reliable than browser-only upload.

## Option B — Git command line (exact patch workflow)

Start with a clean local clone of your existing repository (`git status` should show no changes). Extract the delivery ZIP somewhere **outside** the clone. For each PR, run the corresponding block, wait for review and merge, then start the next one from updated `main`:

```bash
# PR 01
cd /path/to/your/framing-lab
# optional backup: download and keep your currently deployed code and Sheet

git switch main
git pull --ff-only
git switch -c feature/framing-v2-01-data-integrity
git apply --check /path/to/delivery/patches/01-data-integrity.patch
git apply /path/to/delivery/patches/01-data-integrity.patch
git add -A
git commit -m "feat: verified v2 collection and isolated v1 data"
git push -u origin feature/framing-v2-01-data-integrity
```

Now open GitHub and create/merge PR 01. After deploying backend/Worker, repeat for PR 02:

```bash
git switch main && git pull --ff-only
git switch -c feature/framing-v2-02-participant-experience
git apply --check /path/to/delivery/patches/02-participant-experience.patch
git apply /path/to/delivery/patches/02-participant-experience.patch
# EDIT config.js with your real Worker URL before merging.
git add -A
git commit -m "feat: neutral participant experience and verified reveal"
git push -u origin feature/framing-v2-02-participant-experience
```

After PR 02 is merged, do the same using `03-results.patch` on `feature/framing-v2-03-results`; after that merge, `04-methodology.patch` on `feature/framing-v2-04-research-case-study`.

> If `git apply --check` fails, **STOP**: your repo differs from the starter baseline. Do not force-apply. Inspect `git diff`, compare with the corresponding full snapshot and resolve conflicts manually.

## Final launch verification

1. v1 `Responses` and `Summary` untouched, v2 starts with a separate assignment and dataset.
2. Existing website works with `?demo=1` and `?demo=1&arm=high`, with **no** sheet writes.
3. Live v2 frontend uses your configured Worker and shows an explicit error if backend is unreachable.
4. Real incognito submission receives verified confirmation; one `V2_Assignments` and one `V2_Responses` record. Retrying doesn't append a second row.
5. During data collection, `results.html` shows counts but not mean WTP by condition.
6. Public `methodology.html` describes the actual new design and its limitations.
7. Run `npm test` and confirm GitHub Actions is green.
8. Don't publish row-level CSV data or claim a measured effect before the study is complete.

## Risk and limitations

- Public Apps Script endpoint can be accessed directly; Cloudflare CORS is not authentication or anti-bot defense.
- No true participant identity: duplicates across browser profiles remain possible.
- Google/Cloudflare setup requires you to authorize and configure deployments. The delivered code does **not** mean those services are already live.
- Apps Script ContentService redirects to a separate Google domain; Cloudflare Worker follows that redirect and checks the JSON response. Validate this on your real Google account because it cannot be fully tested offline.
