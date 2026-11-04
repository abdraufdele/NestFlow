# POL quote regression fix — 2 November 2026 (Africa/Lagos)

Scope: explicit follow-up in C:\Users\PC\Projects\NestFlow, main. Restore a useful optional POL/USDT conversion with truthful source-age metadata. No dependency, funding, real send, send-flag enablement or deployment. Transactions in the fork harness run only on local Anvil; upstream Polygon receives reads.

## Root cause and policy

History, price feeds and security review read both sources with one rejecting Promise.all. USDT’s adapter rejects latestRoundData, so a usable Aave oracle ratio was discarded along with the optional timestamp. Regression tests reproduced that failure before the production fix (three failures: missing metadata, unsupported USDT rejection, and stale-WPOL failure masked by the USDT error). After correction the quote suite passed 11 tests.

Both Aave prices, source addresses and supported round reads are pinned to the same observed block. Existing Polygon/provider/oracle/base-currency/positive-price/source checks, bigint rounding and recent observation check remain. WPOL latestRoundData must succeed and be valid, positive, not future-dated and at most 3,600 seconds old. A readable USDT round is validated too. If the USDT timestamp call fails, usdtUpdatedAt is null and feedAgeWarnings contains “USDT price feed age unverified”; the positive USDT Aave price still participates in the ratio. This never replaces a failed oracle price with an assumed dollar peg.

The preview shows the metadata note visibly in the existing warning surface. Net return and fee break-even use the available quote when all fee estimates exist. A missing fee estimate remains unavailable; feed-age disclosure does not invent fees. Optional quote failure never blocks an otherwise eligible withdrawal check.

## Actual Polygon fork

Command: `node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/test-fork.ts`.

- PASS at fork block **96599506**: actual quote **89,688 USDT base units per POL = 0.089688 USDT/POL**.
- WPOL source updatedAt **1793604715**; USDT updatedAt unavailable, metadata **USDT price feed age unverified**. This is a block observation, not a current executable conversion price or future fee promise.
- PASS: fork-backed controlled timestamp scenarios — stale WPOL rejects; USDT unverified returns the same real oracle ratio with the label; both-fresh returns it without the label. Only timestamp responses are controlled in these scenarios; they do not claim that the deployed USDT adapter supports latestRoundData.
- PASS: Foundry 1/1; real viem approval/supply/partial/full withdrawal and durable journal reconciliation on local Anvil; one supply/two withdrawals, independent final zero balance, incomplete earnings unavailable through **96599514**.
- No RPC rate limit was observed. Real quote failure is no longer silently accepted by the harness. Rate-limit errors observed on optional source timestamp reads are explicitly failed/reported rather than treated as proof of unsupported feed age. Foundry emitted existing nonfatal cache/explorer notices.

## Local verification

- `npm run typecheck` — PASS after correcting the optional-address type on the fork scenario wrapper. The initial wrapper typecheck identified that address can be undefined in viem’s generic contract-call type; runtime quote calls always supply it.
- `npm test` — PASS: 85 tests in 14 files (including 11 quote tests).
- `npm run test:e2e -- --reporter=line --workers=1` — PASS: 72 tests, including exact numeric net/break-even, unverified label present/absent, stale WPOL and zero-price fallback.
- Strict frontend audit — PASS: zero findings, `pol-quote-ui-audit.json`.
- Documentation UTF-8 / 33 local Markdown links, wording scan and whitespace review — PASS.
- Initial default two-worker Playwright run: 70 passed / 2 failed (`switch rejection`, `stale read`). Both timed out in page.goto before application execution; traces showed HTML 200 after about 9/19 seconds, with JS/CSS loads unfinished and zero mock calls. No quote assertion failed. The full-suite single-worker rerun passed all 72 tests in 2.2 minutes; no assertions or persisted runner configuration were weakened.
- `pol-quote-age-unverified.png` inspected at 320px: visible bold USDT-age note, numeric net estimate 0.410766 USDT and fee break-even 1 day for the synthetic 0.25-USDT/POL fixture; no horizontal overflow. These fixture values are not the actual fork quote above.

## Limits

USDT source age is explicitly unverified; oracle availability and a recent read block do not prove it fresh. One hour is the existing product threshold, not a verified heartbeat. This permission changes the optional estimate policy only; native POL gas estimates, action preflights, exact approvals, transaction recovery, public send guard and 5-USDT private-build cap are unchanged. Mocks and local fork execution are not funded installed-device proof. No new live funds/device test is claimed. Existing Vite bundle warning and documented development dependency findings remain.

Historical Transaction recovery and withdrawal checks/History, price feeds and security review/Design and accessibility review screenshots regenerated by the full regression suite were restored to their committed bytes. Only the new quote-age screenshot is retained.

Final checks: `npm run test:e2e:production -- --reporter=line` PASS (1 production-artifact test; disabled approval/supply/withdraw and zero send RPC calls). `npm run build` PASS (explicit final normal build, TypeScript plus Vite); `npm run lint` PASS. Final dist is the normal send-disabled artifact; existing 591.68 kB main-chunk warning remains. `git diff --check` PASS. No dependency manifests, contract/configuration addresses, send flags, transaction adapter, gas preflight or money math changed.

Verified: actual fork quote/value/block and local action/recovery tests; unit/browser policy cases and normal production send guard. Unverified: actual USDT source feed age, future oracle values/fees/rates and funded installed-device sends. This change labels that uncertainty rather than representing it as verified freshness.
