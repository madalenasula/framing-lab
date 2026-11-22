# Framing Lab — Experiment 001 / version 2 research protocol

**Status:** DRAFT. Complete the start/end dates below **before** accepting the first v2 response; commit the protocol. This is a prospective analysis plan, not registered externally.

- Start date/time (Europe/Zurich): **SET BEFORE LAUNCH**
- End date/time (Europe/Zurich): **SET BEFORE LAUNCH** (suggestion: 28 calendar days after starting, without peeking at group outcomes)
- Primary analysis owner: Madalena Sula
- Study version: `framing-lab-v2`
- Dataset: `V2_Assignments`, `V2_Responses`, `V2_Events`; v1 in `Responses` is **not pooled**

## Research question

Among voluntary visitors to a public hypothetical shopping experiment, how does an example price of CHF 95 versus CHF 45 alter stated maximum willingness to pay for an identical unbranded 750 ml insulated bottle?

## Hypotheses

- **H0:** Mean stated willingness to pay is equal between arms.
- **H1 (directional research expectation):** High-reference arm has higher mean stated WTP.
- Report a two-sided 95% confidence interval for the mean difference; don't change the primary outcome after seeing outcomes.

## Design

- Two-arm randomized design; server-side 50/50 independent assignment using `Math.random` in Apps Script. Suitable for low-stakes exploratory work, not a cryptographically secure allocation system.
- Product image, specs, wording, interactions and currency identical; only example listed price differs.
- Visitor gives integer maximum stated WTP in CHF 0–250. 0 is allowed. No real purchase or payment is involved.
- No user names, emails, IP addresses, device fingerprints, or personal demographic fields are collected in study spreadsheets.
- V2 submissions are saved once per assigned participant ID; cross-browser duplicates cannot reliably be detected.

## Exclusion and cleaning rules (predefined)

- Include saved v2 responses with valid assigned participant IDs, valid arm and WTP integer 0–250.
- Keep zero bids and all valid 0–250 values. Do **not** trim outliers post hoc merely because the result is inconvenient.
- Exclude rejected requests, duplicate attempts (which don't add rows), and records belonging to v1.
- Report arm assignment counts versus completion counts and examine sample-ratio mismatch and condition-specific dropout.
- If bot activity or manipulation is suspected, disclose investigation and provide sensitivity analyses; do not selectively remove responses silently.

## Stopping rule and power

- Before the first v2 participant, commit **calendar start and end dates**. Close collection on the predefined date, whether or not the effect looks positive.
- Do not choose a target sample size based on observing the difference during active collection.
- The public-results threshold of 20 per group is a disclosure/display gate **only**, not evidence of adequate statistical power.
- If no credible standard-deviation estimate exists, label results exploratory. For future versions, estimate an SD from a separate pilot and calculate sample size based on a meaningful CHF difference and desired power.

## Primary analysis and reporting

1. Count randomized assignments and saved completions by condition.
2. Report mean WTP, median, SD and grouped distribution per arm.
3. Estimate high minus low mean WTP with a Welch unequal-variance two-sided 95% confidence interval; optionally report a two-sided Welch p-value for descriptive context, not as a substitute for effect magnitude.
4. Disclose self-selected sample, hypothetical bias, the ability of shown prices to signal quality, and missing real-purchase outcomes.
5. Avoid conclusions about individual respondents, nationwide Swiss consumers, sales uplift, or price legality.
6. Do not publish row-level anonymous IDs or individual answers.

## Commercial follow-up

A future real e-commerce experiment should test accurate and compliant price communication and measure commercial conversion, margin and trust—not extrapolate from this study's hypothetical WTP.
