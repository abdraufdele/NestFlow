# Nimiq Pay integration: device test results

Fill-in template; device and mainnet tests are NOT RUN. Record actual observations; do not copy expected text as evidence. Use PASS / FAIL / NOT RUN / BLOCKED in pass/fail; explain blocked or unavailable checks in notes. Local preview success does not prove installed-host compatibility.

Source: [Nimiq Pay manual tests](nimiq-pay-manual-tests.md). One row per numbered loading step and checkbox item, in source order (L = load, P = read-only probe, M = separately authorized mainnet exercise).

## Session
- Date/time/timezone:
- Tester:
- Device / OS:
- Nimiq Pay version:
- Build commit:
- HTTPS site URL:
- Diagnostics URL:
- Observation block / timestamp:
- Screenshots / evidence location:

## Provider observations
| field | observed value / error |
|---|---|
| Provider present (`window.ethereum`) | |
| Nimiq SDK initialization | |
| chainId | |
| accounts (redact before sharing) | |
| USDT / USDT0 balance | |
| POL balance | |
| Existing Aave position | |
| `eth_chainId` check | |
| `eth_accounts` check | |
| `eth_sendTransaction` check | |

`eth_sendTransaction` must remain runtime unverified in the no-send probe. Record what the page says; never invoke it to test capability. No credentials, private keys or seed phrases belong in this file.

## Checklist results
Mainnet rows remain NOT RUN unless the operator separately authorizes the exact actions and a reviewed host harness is available; this deployment-preparation task authorizes no mainnet transactions.

| test | expected | what I saw | pass/fail | notes |
|---|---|---|---|---|
| L01 — Load in Nimiq Pay (five steps) | Run `npm run build`; host `dist/` on a static host with an SPA fallback to `index.html` for `/diagnostics`. |  | NOT RUN |  |
| L02 — Load in Nimiq Pay (five steps) | Use a phone-reachable HTTPS URL with a valid certificate, such as `https://YOUR-HOST/diagnostics`. |  | NOT RUN |  |
| L03 — Load in Nimiq Pay (five steps) | Open the installed Nimiq Pay app and go to **Mini Apps**. |  | NOT RUN |  |
| L04 — Load in Nimiq Pay (five steps) | Enter the complete URL in **Custom URL**, then open it and acknowledge any unfamiliar-app warning. |  | NOT RUN |  |
| L05 — Load in Nimiq Pay (five steps) | Tap **Refresh diagnostics**, then **Connect** if accounts are empty; record SDK and EVM results independently. |  | NOT RUN |  |
| P01 — Read-only host probe | Open `/diagnostics` in an ordinary browser without a wallet; refresh: missing provider and unavailable balances are visible, never zero placeholders. SDK failure appears after its timeout. |  | NOT RUN |  |
| P02 — Read-only host probe | Open inside Nimiq Pay; record SDK init success/failure and `window.ethereum` presence separately. Refresh after delayed injection. |  | NOT RUN |  |
| P03 — Read-only host probe | Refresh before connecting: `eth_accounts` either returns addresses or an explicit disconnected/error result; it must not silently invent an account. |  | NOT RUN |  |
| P04 — Read-only host probe | Tap Connect; reject once, record visible error/code; retry and authorize. Refresh and compare the first EVM account with the intended wallet. Do not confuse Nimiq and EVM addresses. |  | NOT RUN |  |
| P05 — Read-only host probe | Record actual `eth_chainId` and `eth_accounts` capability results. `eth_sendTransaction` must say runtime unverified; refresh must never open a transaction/signature dialog. Invalid-parameter send calls are deliberately excluded. |  | NOT RUN |  |
| P06 — Read-only host probe | On Polygon 137 (`0x89`), compare wallet USDT/USDT0 and POL with independent chain reads for the same account. Compare supplied USDT, debt/collateral, block and timestamp with the exact Core logic and fork tests-configured Aave reserve, including an existing position created elsewhere. No history/import/earnings UI is in Nimiq Pay integration tests. |  | NOT RUN |  |
| P07 — Read-only host probe | Use an account with no position: verify observed zero, distinct from a failed read. A supplied balance does not prove withdrawability. |  | NOT RUN |  |
| P08 — Read-only host probe | Select a different EVM chain using the host if available; refresh: wrong-chain message, no Polygon balances. Request Polygon, reject once and record error, then accept and refresh. If host cannot switch chains, record that limitation, do not mark passed. |  | NOT RUN |  |
| P09 — Read-only host probe | Use an account with USDT and zero POL: refresh shows Missing POL. A nonzero POL balance alone does not prove enough gas. Do not attempt a transaction for this test. |  | NOT RUN |  |
| P10 — Read-only host probe | Tap Request test signature; reject the harmless plain message in the native dialog. Record visible error/code (often 4001; actual host behavior decides). This is message signing, not an approval or transaction. A timeout does not cancel a pending native dialog: dismiss it before retrying. |  | NOT RUN |  |
| P11 — Read-only host probe | Disable connectivity or block RPC: failed calls/timeouts are visible independently; a failed Aave read must not become zero. Restore and refresh. |  | NOT RUN |  |
| P12 — Read-only host probe | Change account/chain during reads and after results: events, if emitted, clear results; refresh rechecks identity. Hosts without events require manual refresh. Verify the displayed account matches the snapshot before interpreting balances. |  | NOT RUN |  |
| P13 — Read-only host probe | Background/reopen the app and reload `/diagnostics`; repeat refresh. Record observed differences. No transaction recovery screen is implemented in Nimiq Pay integration tests. |  | NOT RUN |  |
| M01 — Mainnet exercise — explicit operator authorization required | Separately authorize in writing: Polygon 137, exact account, verified token and Pool addresses from freshly resolved Core logic and fork tests config, maximum USDT amount and maximum POL fee budget for approval, supply and withdrawal. Example small amount: 1 USDT = `1_000_000n`, only if the operator accepts the risk and costs. Authorization is not granted by this checklist. |  | NOT RUN |  |
| M02 — Mainnet exercise — explicit operator authorization required | Review the harness before use: injected wallet only, `execution: 'explicit-mainnet'` only after that authorization, durable TxStore, fresh config resolution, receipt reconciliation before each action, exact amounts, no automatic retries. Check the native account/chain again before every approval. |  | NOT RUN |  |
| M03 — Mainnet exercise — explicit operator authorization required | Record baseline wallet USDT/POL, supplied balance, allowance, reserve flags/caps/liquidity and debt/collateral, at an observation block. Run core eligibility checks and simulation and gas estimation; stop on failures or a fee budget breach. Reserve POL for exit; estimates may change. |  | NOT RUN |  |
| M04 — Mainnet exercise — explicit operator authorization required | Approve only the exact authorized amount using the core library’s `approvalSteps` and `approve`. If a nonzero allowance requires reset, obtain separate approval for `approve(0)` and confirm it first. Inspect token, Pool spender, amount and gas in the native wallet dialog. Never unlimited approval. |  | NOT RUN |  |
| M05 — Mainnet exercise — explicit operator authorization required | Record hash immediately and persist it; wait for a successful receipt, reconcile TxStore and independently reread allowance. Approval is not supply. Unknown/pending receipt: stop and reconcile before retrying. |  | NOT RUN |  |
| M06 — Mainnet exercise — explicit operator authorization required | Recheck account/chain/config, supply eligibility, gas and allowance. Invoke the core library’s `supply` for the exact authorized amount; inspect the native dialog before approving. Persist hash, confirm receipt and reconcile; refresh diagnostics and compare wallet and supplied balance changes. A hash alone is not success. |  | NOT RUN |  |
| M07 — Mainnet exercise — explicit operator authorization required | Recheck withdrawal eligibility, reserve liquidity, debt/collateral and simulation; invoke the core library’s `withdraw` for the authorized partial amount, then, only if separately authorized, the remaining balance. Inspect recipient/account and fees. Confirm receipts and compare wallet USDT, supplied balance and POL. Supply/withdraw each require their own native consent. |  | NOT RUN |  |
| M08 — Mainnet exercise — explicit operator authorization required | Capture rejection/revert/pending outcomes and verify no duplicate submission. Stop if any address, account, chain, amount or fee differs from authorization. Record actual fees and each confirmed hash; mark unavailable or untested behavior honestly. |  | NOT RUN |  |

## Outcome
- Device compatibility conclusion:
- Failed / blocked checks:
- Follow-up actions:
- Mainnet authorization reference (if any; otherwise none):
- Confirmed transaction hashes / actual fees (only if separately authorized and executed):
