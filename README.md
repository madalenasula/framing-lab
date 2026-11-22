# Framing Lab — Experiment 001 (v2)

**Explore whether a price shown beside an identical product changes the maximum amount people say they would pay.**

A small, public consumer-behavior experiment developed as a product-management and marketing research case study. Design remains Oner Active × Rhode *influenced*, but uses entirely original branding, markup, and a custom SVG bottle. No affiliated branding or assets.

## Where everything runs

| Component | Service | What it does |
|---|---|---|
| `index.html`, `results.html`, `methodology.html`, `assets/*` | GitHub Pages | Displays the experiment, reveal, methodology and publication-controlled results |
| `worker/src/index.mjs` | Cloudflare Workers | Accepts JSON cross-origin from Pages, validates requests, reads verified backend replies |
| `backend/Code.gs` | Google Apps Script | Server-side assignment, unique response saves, event logging, status/aggregate results |
| Bound Google Sheet | Google Sheets | Private experimental data (v1 remains separate) |

**Current deployment:** After PR 02, the public GitHub Pages frontend is version 2. The v1 spreadsheet data remains separate. Google Apps Script and Cloudflare deployments are managed independently from GitHub and must be checked separately.

## Deployment: exact order

### 1. Preserve the original data

- Make a copy of your existing response spreadsheet as a backup.
- Leave the old `Responses` and `Summary` tabs alone. All v2 data goes into `V2_Assignments`, `V2_Responses` and `V2_Events`.
- Review `docs/RESEARCH_PROTOCOL.md` and record the real v2 start date and stopping rule. **If v2 has already received participant data before these were fixed, do not backdate or claim preregistration**; state when the plan was documented, and disclose any changes. If you change the stimulus or question, version the study again.

### 2. Keep the current Google Apps Script deployment synchronized

- In the response Google Sheet: **Extensions → Apps Script**.
- Back up the currently deployed script code; replace the editor source with `backend/Code.gs` in the Apps Script project used by v2. If v1 and v2 are separate versioned deployments of the same script project, editing source does not alter the already-deployed v1 version unless that deployment is updated.
- **Deploy → Manage deployments → select the v2 Web app → pencil icon → Version: New version → Deploy.** Keep *Execute as: Me* and *Who has access: Anyone*.
- Editing the existing v2 deployment preserves its `/exec` URL, so you do not need to change the Worker secret. **Do not edit or remove the original v1 deployment**. Keep v1 and v2 sheet tabs intact.

### 3. Worker bridge (configured in PR 01)

Requires a Cloudflare account. If using Node.js locally:

```bash
# Set the exact Pages origin in wrangler.toml first, e.g. https://yourname.github.io
npx wrangler login
npx wrangler secret put APPS_SCRIPT_URL
# Paste your existing script.google.com/macros/s/.../exec URL when prompted
npx wrangler deploy
```

Copy the resulting `https://....workers.dev` URL. `wrangler.toml` has a placeholder `ALLOWED_ORIGIN` that must be replaced with your exact Pages origin, **without `/framing-lab/` or trailing slash**. The Apps Script URL stays in a Worker secret, never a git-tracked file.

A direct browser visit to `/api/health` can return `403 Origin not allowed`: that is expected because API calls require your site's `Origin` header. Use the website, browser developer tools, or `curl -H 'Origin: https://yourname.github.io' ...` to test it.

### 4. Live v2 website (configured in PR 02)

Set your Worker base URL in `config.js`:

```js
window.FRAMING_LAB_API = 'https://your-worker.workers.dev';
```

Then publish the updated `index.html`, `config.js`, and `assets/*` through GitHub Pages. First open `?demo=1` to preview (never records), then use an incognito session **without** demo for a real submission. Check that `V2_Assignments` and `V2_Responses` appear and contain exactly one saved answer. An API failure must show an error, not a false success.

### 5. Publish public study status and methodology (combined final PR)

Publish `results.html`, `assets/results.js` and `methodology.html`. Group WTP outcomes remain hidden while the study is collecting. After the documented study closing date, change `V2_STATUS = 'closed'` in Apps Script and redeploy a new version; published aggregates require at least 20 saved observations **in each arm**. That is a disclosure threshold, not a power calculation.

### 6. Analyze privately

Export only the `V2_Responses` tab from Google Sheets to CSV. Run:

```bash
python3 -m pip install scipy  # optional but required for accurate Welch CI
python3 analysis/analyse.py /path/to/V2_Responses.csv
```

Only aggregate findings should be published. Do not commit the CSV, pseudonymous IDs or a spreadsheet export to GitHub.

## Run tests

```bash
npm test
```

No npm dependencies are required for the automated Worker and Apps Script mock tests (Node 20+).

## Public interpretation

- **Primary outcome:** stated maximum willingness to pay, whole CHF 0–250.
- **Treatment:** example listed price CHF 45 vs CHF 95 on an identical product.
- **Primary contrast:** high-minus-low average stated WTP.
- **Assignment:** server-side 50/50, persisted by anonymous ID.
- **Audience:** voluntary visitors, not a random sample of the Swiss population.
- **Limits:** hypothetical response bias, price–quality signaling, cross-browser duplicates, self-selection, possible bot submissions, no true purchase or business uplift measurement.

## Privacy and integrity

- No names, emails, phone numbers, device fingerprint, or study-level IP collection.
- Google and Cloudflare still process normal service request metadata; do not promise complete anonymity.
- IDs are random, pseudonymous, and stored to enforce per-browser save idempotency.
- This is not enterprise-grade fraud prevention. The public Apps Script deployment can be called directly; a browser Origin check cannot authenticate requests to Apps Script.
- Apps Script and Google Sheets have quotas; monitor before distributing widely.
- The v1 `mode:no-cors` path is preserved for compatibility only; v2 uses verified Worker JSON acknowledgements.

## GitHub PR instructions

The original four-PR implementation notes remain in `docs/PULL_REQUEST_GUIDE.md`. PRs 03 and 04 may also be merged together as one final pull request after PR 02.
