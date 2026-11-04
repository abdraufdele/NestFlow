# Transaction recovery and withdrawal checks verification — 2 November 2026 (Africa/Lagos)

Scope: explicit Transaction recovery and withdrawal checks request in `C:\Users\PC\Projects\NestFlow`, branch main.
Core logic and fork tests–Wallet interface tests commits retained; no Reporting and polish/reporting or deferred visual polish. No dependencies
added, no mainnet transaction, no flag enabling, no deployment, no funding.

## Host evidence and limits

User-verified installed Nimiq Pay findings: provider present; initial chain 0x1;
native connect/switch dialogs; state visible only after a reread; no identity
persistence across sessions; rejection code 4001. We did not rerun device checks.
`eth_sendTransaction`, approval/supply/withdraw and independent Aave access remain
unverified on that device. Mocked RPC and Anvil are not device-send evidence.

## Feature evidence

| Feature | Evidence | Failure handling / limits |
|---|---|---|
| Launch/recovery | Existing TxStore unit tests, flow pending/reload/duplicate/revert/rejection cases, Transaction recovery and withdrawal checks replacement browser cases | Connect then switch/reread, reconcile before reads and every send; canonical receipts/two confirmations; unknown remains locked; replacement requires sender/nonce plus original call fingerprint |
| Withdrawal diagnostics | Transaction recovery and withdrawal checks liquidity/paused/frozen/debt browser cases | Passed/failed observation timestamp for the amount; freeze alone allows withdrawal; pause blocks; debt/collateral and failed/omitted simulation explained; gas rechecked before send |
| Manual shortfall | Transaction recovery and withdrawal checks covered/partial/insufficient/invalid/restricted/simulation browser cases | Bigint wallet comparison; fresh eligibility before suggesting; later withdrawal review and payment remain separate; no payment detection |
| Independent exit | Transaction recovery and withdrawal checks disconnected route/browser content review | Numbered Aave Polygon V3 steps, same account/token, POL, receipt/retry warnings and config-sourced addresses/source links; no seed export; alternative host access unverified |
| POL quote and economics | quote unit tests; mocked available/unavailable browser cases; actual fork oracle reads below | Optional failure preserves withdrawals; ratio of WPOL and USDT oracle prices, conservative rounding; missing fees/quote keeps net and break-even unavailable; all estimates |
| Preferences | IndexedDB unit restore/reset/ordering tests and browser reload/reset/recovery-retention tests | Only preference and days strings; global to this device, deliberately no address/chain scoping; error limitation shown; reset preserves transaction journal |
| Small fixes | First-read/stale-timer/native-rejection/dev-link browser cases; diagnostics rejection unit case | No stale banner before successful connected read; friendly rejection with raw error in logs; Diagnostics link only in Vite dev build |
| Funded-build guard | Pure cap unit test and normal production artifact browser test | Flag remains off; private opt-in only, 5 USDT per action including approve/withdraw, no MAX sentinel; public build instructions in manual checklist |
| Visual/accessibility | m4-mobile.png, m4-desktop.png, m4-independent-exit.png, narrow/keyboard/reduced-motion browser checks; m4-ui-audit.json | Existing shared panels/forms/tokens and original logo preserved; deferred polish recorded; full screen-reader/device assessment unverified |

## Oracle verification

Documentation: [Aave oracle contract](https://aave.com/docs/aave-v3/smart-contracts/oracles),
[Polygon address registry](https://github.com/aave-dao/aave-address-book/blob/main/src/ts/AaveV3Polygon.ts).
Addresses and sources are recorded in `src/config/aave.ts`. The runtime resolves
`getPriceOracle()` from the PoolAddressesProvider and verifies its registry anchor.
USD base currency zero-address / unit 100,000,000, nonzero source addresses and
prices are required. Both asset prices are read at one block, converted by ratio
rather than assuming USDT equals USD; fees round upward to USDT base units.

Read-only upstream state through Anvil, fork block **96580707**:
- Oracle: `0xb023e699F5a33916Ea823A16485e259257cA8Bd1`.
- WPOL: `0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270`.
- WPOL source: `0xAB594600376Ec9fD91F8e885dADF0CE036862dE0`.
- USDT source: `0x01Aba1Fe7D72a3490bEef7CD0C09e1Ba2dD88D83`.
- Quote: **91,297 USDT base units/POL = 0.091297 USDT/POL** (observation only).

Quote observation block age is checked; source-feed update age is not independently
validated. The UI discloses this. This is an Aave protocol oracle observation, not
an executable conversion price or a forecast. Future gas/rates/liquidity remain
unknown. Break-even does not compensate for investment risk.

## Final commands

- `npm run typecheck` — PASS (final sequential run).
- `npm run lint` — PASS (final sequential run).
- `npm test` — PASS: **74 tests in 12 files**.
- `npm run test:e2e -- --reporter=line` — PASS: **53 mocked-provider tests**, normal two-worker configuration. Includes interest-accrual regression, persisted preference/account change, pending reload and replacement/cancellation proof.
- `npm run test:e2e:production -- --reporter=line` — PASS: **1 production-artifact test**, no send RPC calls; all transaction actions disabled.
- `npm run build` — PASS, executed by the production browser check. Final `dist` is the normal production artifact; funded-send flag off.
- `node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/test-fork.ts` — PASS at **96580707**: Foundry 1/1 and real viem approve/supply/partial/full withdrawal plus receipt-journal reconciliation on local Anvil. Only reads reached upstream Polygon. Oracle source and quote verification passed in the same harness.
- Strict frontend audit — PASS, zero findings in `docs/m4-ui-audit.json`.
- `git diff --check` — PASS.

The new diagnostic-read rejection test and interest-accrual browser regression
were observed failing before their fixes, then passed in the complete final runs.
A fresh reviewer confirmed the Important finding resolved with no remaining
Important/Critical findings. Mobile, desktop and disconnected independent-exit
screenshots were inspected; brand files and dependency manifests are unchanged.
Vite's existing bundle-size warning remains. Foundry emitted nonfatal local
cache/explorer notices.

Net and break-even use remaining entry plus estimated exit fees; already-paid
fees are explicitly excluded. All future fees/rates/liquidity are estimates.

## Review

Fresh read-only review found that exact supplied-balance equality would reject
normal aToken interest accrual during shortfall checks. A failing browser regression
was added before correction. Fresh eligibility remains authoritative for supplied
balance/liquidity; wallet changes still require refreshing the payment comparison.
Smaller review fixes cover reset-in-progress edits, fresh reads after revert and
friendly diagnostic-read rejection text while keeping the raw error in logs.

Preliminary parallel verification hit transient read timing under simultaneous
fork/browser load and an ESLint walk raced Playwright's test-results directory
cleanup. Final checks use complete normal browser coverage and sequential lint.
No success claim is based on those failed preliminary runs.
