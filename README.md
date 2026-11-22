# Framing Lab — Marketing Experiment - 1

A self-contained, interactive consumer-psychology experiment exploring the effect of hypothetical reference prices on **stated willingness to pay**.

## Design

An original visual influenced by the Brands Oner Active and Rhode. No proprietary marks, logos, photography, or product assets from either brand are used. The unbranded bottle is a custom vector illustration in `index.html`. The same object and question are displayed to both randomized groups.

## Experiment

- **Hypothesis:** participants seeing a CHF 95 hypothetical reference price will state a higher maximum willingness to pay than those seeing CHF 45.
- **Randomization:** 50/50 browser assignment, persisted in localStorage.
- **Outcome:** integer stated willingness to pay in CHF, 0–250.
- **Fixed across groups:** product, visualization, description, question and UI.
- **Data collection:** Google Apps Script / Google Sheet backend, preconfigured in the supplied HTML.
- **Debrief:** method revealed only after response.

## Publish / replace your current site

1. Open your GitHub repository.
2. Replace the repository-root `index.html` with the new `index.html` from this folder and commit.
3. GitHub Pages will update from your existing `main` branch configuration.
4. You **do not** need to change the Google Apps Script deployment. Your previously provided `/exec` endpoint is already configured.
5. Test on your live website, then verify that a new row appears in the `Responses` tab of the Google Sheet. Browser submission feedback alone cannot prove the Sheet stored a response.

### Preview safely

Open your website with `?demo=1` appended. This enables preview without recording data and provides a retry link for viewing the alternative condition. Opening `index.html` directly without `?demo=1` uses the configured endpoint, so it is not a no-collection preview.

## Technical notes

- Static HTML, CSS, SVG and JavaScript; no dependencies, hosting fees or build step.
- `backend/Code.gs` is included for reference. If Apps Script is already deployed, you do not need to paste or redeploy it.
- The spreadsheet endpoint is publicly callable. Do not collect personal/sensitive data. Browser-based duplicate limiting is not strong identity verification.
- The `Summary` tab created by the collector reports group counts, means, medians and descriptive differences. Small self-selected samples do not establish a representative population effect or statistical significance.
- If you publish the repository, the endpoint URL will also be visible in the HTML source. This does not grant Sheet read access, but it allows unsolicited submissions; use a more controlled backend for a larger public study.
