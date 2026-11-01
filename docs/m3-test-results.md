# M3 verification — 1 November 2026

Scope: M3 only in C:\Users\PC\Projects\NestFlow, branch main. The current request expressly authorizes the listed UI and simpler signature option A; it does not declare funded-device tier checks passed. M1/M2 commits are retained. No mainnet send, deployment, key access, new protocol, backend or M4/M5 implementation.

## Host evidence supplied by the user
Verified by the user on installed Android Nimiq Pay: injected provider present; opening chain 0x1; connect/switch use native dialogs; resolved switch requires reread to observe state; account/chain do not persist between sessions; Polygon reads work; rejection code 4001. We did not rerun these device checks. Device version/screenshots were not supplied, so the historical M2 result-template rows remain untouched.

The wallet has 0 USDT and 0 POL. eth_sendTransaction, approve, supply and withdraw remain **unverified on device**. The new UI is locally verified only. See the manual checklist's **Deferred until funded** section.

## Implemented behavior and evidence
| Feature | Verification | Failure coverage / limits |
|---|---|---|
| Single wallet adapter / launch | src/lib/wallet.m3.test.ts; e2e/flow.spec.ts | Every mount/connect requests permission; switch result reread; wrong-chain/disconnected/missing provider; no stored identity |
| Confirmed existing position | Existing readPosition/readReserveState/config resolution via real viem over mocked RPC | Failed/stale data never become zero; exact supported reserve/6 decimals checked |
| Spending preference / signature A | e2e/flow.spec.ts; e2e/resilience.spec.ts | Bigint amounts, invalid precision, zero/above-wallet targets, keyboard slider, text equivalent; preferences never send or withdraw |
| Holding/cost/earnings preview | Existing M1 math; browser scenarios | Approval/supply estimates, uncertain exit; absent estimates explicit; no POL/USDT quote, so net and break-even unavailable |
| Approval and supply | Real M1 actions/viem/IndexedDB with mocked EIP-1193 | Separate reset/exact/supply consent; native rejection, pending, revert, duplicate clicks; no automatic resend |
| Withdrawal | Real M1 eligibility/simulation and action | Invalid amounts, reserve pause/freeze distinction, liquidity, account constraints/simulation; observed checks timestamp |
| Identity/freshness | Browser account/chain and slow-read races, silent account switch, 60s expiry | Snapshot/preview invalidated; stale completions ignored; identity reread before actions |
| RPC/storage resilience | Timeout unit regression; browser failed reads/recovery and IndexedDB denial | Read RPC bound 15s; native dialogs have no artificial cancellation timeout; unavailable storage disables transaction flow |
| Pending/reopen | Browser reload and existing TxStore unit tests | Fresh launch then stored receipt reconciliation; unresolved record locks further sends |
| Production safety | e2e/production.spec.ts | Normal build reads with mock but cannot approve/supply/withdraw; eth_sendTransaction never called |
| Visual/accessibility | docs/m3-mobile.png; docs/m3-desktop.png; browser keyboard, focus, reduced motion, narrow overflow checks | Original logo unchanged, brand-derived variables; no full screen-reader/device certification |

## Commands and outcomes
- npm run typecheck — PASS.
- npm run lint — PASS.
- npm test — PASS, 64 tests across 10 files.
- npm run test:e2e -- --reporter=line — PASS, 33 mocked-provider browser tests.
- npm run test:e2e:production -- --reporter=line — PASS, 1 production-artifact browser test; no send RPC calls.
- npm run build — PASS, invoked by the production browser check; final dist is the normal production build.
- node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/test-fork.ts — PASS at Polygon fork block **96572762**: Foundry 1/1 plus actual viem approve/supply/partial/full withdrawal and journal reconciliation on local Anvil. Only upstream reads reached Polygon.
- Strict frontend audit — PASS, zero findings, docs/m3-ui-audit.json.
- git diff --check — PASS.

## Review and meaningful regression tests
A fresh read-only final review found two Important issues. Stalled reads were reproduced with a failing fake-timer test and fixed with a 15-second read bound. Preapproval supply-estimate failure was reproduced with an allowance-sensitive mock and fixed by refreshing costs after each confirmed approval/reset. Native dialogs are not treated as cancelled by timeout. Zero-reset estimation is checked against the actual next approval step.

The first browser attempt exposed Vite development dependency-optimizer stalls before render. Browser tests now serve a bundled static E2E-mode build. The normal build is rebuilt and checked separately afterward. Early assertion failures (ambiguous pending status selector and pointer-vs-keyboard focus) were corrected; financial failure coverage was retained.

## Remaining assumptions and limits
- Device sends, native transaction return values/events, funded rejection/reload/gas behavior are unknown until the deferred checklist is performed with separate exact authorization. Funding alone does not enable sends.
- Mock state is synthetic; fork execution proves the existing M1 library on local fork contracts, not Nimiq Pay transaction compatibility.
- All estimates are observations, not future rates/fees/liquidity. Below 0.01 USDT scenario earnings triggers a small-earnings warning. Without a conversion quote, no numerical comparison between USDT earnings and POL costs is claimed.
- When a zero-reset is needed, its gas estimate is for the next step; later estimates refresh after confirmation. Missing supply/exit estimates before allowance/position exists stay unavailable.
- Preferences are ephemeral in this M3 UI and cleared on identity changes; durable transaction records reuse the existing account/chain journal.
- Vite reports a bundle-size warning; full screen-reader/device usability checks are unverified. Foundry emitted nonfatal local cache/etherscan notices.
