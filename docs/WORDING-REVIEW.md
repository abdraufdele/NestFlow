# M5b wording review — 2 November 2026

Scope: UI text in src, README, CHANGELOG, DESIGN, UX-CONTRACT, SECURITY and Markdown under docs, including historical plans/evidence. AGENTS.md remains the authoritative rule source and is unchanged. Repeat this review:

```powershell
rg -n -i '\bbank\b|\binsured\b|\bguaranteed\b|official Aave|gasless' src docs README.md CHANGELOG.md DESIGN.md UX-CONTRACT.md SECURITY.md --glob '!WORDING-REVIEW.md'
```

Expected: no matches (rg exit 1). Also inspect estimate/forecast, source/time, fee units, approval versus supply, receipt versus hash, withdrawal limits, independence and device-test wording in each screen. Preserve dated evidence as historical results, not fresh verification.

## Changes

| Location | Change and reason |
|---|---|
| App header/intro (step 1) | Replaced competing slogans with one “Room to spend.” tagline and independent-app identity. |
| README (step 2) | Replaced stale M1–M3 summary with current usage and evidence; explicit funded-device uncertainty, estimates, separate approvals, POL costs and independent exit limits. |
| docs/PLAN.md | Replaced prohibited-term examples with a link to AGENTS.md and restrictions on returns, fee sponsorship and unconditional access. Corrected the inverted instruction to preserve forbidden copy. |
| docs/PLAN.md | Recorded device-local preferences as the implemented M4 decision; recovery/read scoping is separate. |
| docs/BACKLOG.md | Rephrased three rejected/deferred references in neutral terms: background delivery, fee sponsorship and deposit protection. Scope and rejected status are unchanged. |
| docs/nimiq-pay-manual-tests.md | Unfilled M2 template rows now point to later user-reported read/connect/switch observations; funded sends still unverified. |
| UX-CONTRACT.md | Replaced obsolete blanket no-conversion statements with actual optional quote/freshness/all-fees conditions. |
| DESIGN.md / docs/BACKLOG.md | Normalized newly inserted punctuation to UTF-8 after review caught mixed encoding. |

No prohibited positive claim was found in UI strings, so transaction/error wording remains unchanged. Amounts/fees use USDT/POL labels; future earnings, rates and fees are estimates. Approval is separate from supply; pending/unknown stays unresolved. External aToken transfers are not interest. Independent exit remains untested in installed Nimiq Pay.

Verification: repeat the search, inspect each diff, and compare claims with M3/M4/M5a records and src/lib/wallet.ts. This review does not verify legal status, future returns, funded device behavior or third-party availability.
