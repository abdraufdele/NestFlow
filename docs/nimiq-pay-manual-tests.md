# Nimiq Pay M2 manual tests

Status: NOT RUN on a device or mainnet. Local automated tests are not host evidence.
Record date, OS/device, installed Nimiq Pay version, build commit, URL, account (redact when sharing), chain, screenshots, observed results and pass/fail for each item. Do not record keys or seed phrases.

## Load in Nimiq Pay (five steps)
1. Run `npm run build`; host `dist/` on a static host with an SPA fallback to `index.html` for `/diagnostics`.
2. Use a phone-reachable HTTPS URL with a valid certificate, such as `https://YOUR-HOST/diagnostics`.
3. Open the installed Nimiq Pay app and go to **Mini Apps**.
4. Enter the complete URL in **Custom URL**, then open it and acknowledge any unfamiliar-app warning.
5. Tap **Refresh diagnostics**, then **Connect** if accounts are empty; record SDK and EVM results independently.

The docs also permit LAN HTTP development: `npm run dev -- --host`, same Wi-Fi, enter `http://PC-LAN-IP:5173/diagnostics`. Phone localhost is not the PC. HTTPS is the deployment choice here; the docs warn that LAN HTTP lacks secure-context APIs. Hosting is not performed by this milestone.

Sources checked 2026-11-01:
- [Overview and SDK/EVM separation](https://nimiq.dev/mini-apps)
- [SDK init with timeout](https://nimiq.dev/mini-apps/tutorials/mini-app-tutorial)
- [Ethereum methods and confirmation behavior](https://nimiq.dev/mini-apps/api-reference/ethereum-provider)
- [Custom URL, LAN hosting and network switch](https://nimiq.dev/mini-apps/development/load-local-mini-app)

## Read-only host probe
- [ ] Open `/diagnostics` in an ordinary browser without a wallet; refresh: missing provider and unavailable balances are visible, never zero placeholders. SDK failure appears after its timeout.
- [ ] Open inside Nimiq Pay; record SDK init success/failure and `window.ethereum` presence separately. Refresh after delayed injection.
- [ ] Refresh before connecting: `eth_accounts` either returns addresses or an explicit disconnected/error result; it must not silently invent an account.
- [ ] Tap Connect; reject once, record visible error/code; retry and authorize. Refresh and compare the first EVM account with the intended wallet. Do not confuse Nimiq and EVM addresses.
- [ ] Record actual `eth_chainId` and `eth_accounts` capability results. `eth_sendTransaction` must say runtime unverified; refresh must never open a transaction/signature dialog. Invalid-parameter send calls are deliberately excluded.
- [ ] On Polygon 137 (`0x89`), compare wallet USDT/USDT0 and POL with independent chain reads for the same account. Compare supplied USDT, debt/collateral, block and timestamp with the exact M1-configured Aave reserve, including an existing position created elsewhere. No history/import/earnings UI is in M2.
- [ ] Use an account with no position: verify observed zero, distinct from a failed read. A supplied balance does not prove withdrawability.
- [ ] Select a different EVM chain using the host if available; refresh: wrong-chain message, no Polygon balances. Request Polygon, reject once and record error, then accept and refresh. If host cannot switch chains, record that limitation, do not mark passed.
- [ ] Use an account with USDT and zero POL: refresh shows Missing POL. A nonzero POL balance alone does not prove enough gas. Do not attempt a transaction for this test.
- [ ] Tap Request test signature; reject the harmless plain message in the native dialog. Record visible error/code (often 4001; actual host behavior decides). This is message signing, not an approval or transaction. A timeout does not cancel a pending native dialog: dismiss it before retrying.
- [ ] Disable connectivity or block RPC: failed calls/timeouts are visible independently; a failed Aave read must not become zero. Restore and refresh.
- [ ] Change account/chain during reads and after results: events, if emitted, clear results; refresh rechecks identity. Hosts without events require manual refresh. Verify the displayed account matches the snapshot before interpreting balances.
- [ ] Background/reopen the app and reload `/diagnostics`; repeat refresh. Record observed differences. No transaction recovery screen is implemented in M2.

## Mainnet exercise — explicit operator authorization required

The diagnostics page intentionally has no transaction controls. The steps below require an operator-reviewed harness calling the existing M1 functions in `src/lib/aave.ts` through the injected wallet, inside Nimiq Pay. This checklist does not supply a transaction harness or claim the flow was exercised. Until such a harness is available, mark these items NOT RUN, not passed. Do not use an unrelated wallet as host proof. Never give a website private keys.

Nimiq Pay's hidden testnet setting affects Nimiq only: EVM calls still use mainnet chains. Do not use that switch as a safety boundary.

- [ ] Separately authorize in writing: Polygon 137, exact account, verified token and Pool addresses from freshly resolved M1 config, maximum USDT amount and maximum POL fee budget for approval, supply and withdrawal. Example small amount: 1 USDT = `1_000_000n`, only if the operator accepts the risk and costs. Authorization is not granted by this checklist.
- [ ] Review the harness before use: injected wallet only, `execution: 'explicit-mainnet'` only after that authorization, durable TxStore, fresh config resolution, receipt reconciliation before each action, exact amounts, no automatic retries. Check the native account/chain again before every approval.
- [ ] Record baseline wallet USDT/POL, supplied balance, allowance, reserve flags/caps/liquidity and debt/collateral, at an observation block. Run M1 eligibility/simulation and gas estimation; stop on failures or a fee budget breach. Reserve POL for exit; estimates may change.
- [ ] Approve only the exact authorized amount using M1 `approvalSteps` and `approve`. If a nonzero allowance requires reset, obtain separate approval for `approve(0)` and confirm it first. Inspect token, Pool spender, amount and gas in the native wallet dialog. Never unlimited approval.
- [ ] Record hash immediately and persist it; wait for a successful receipt, reconcile TxStore and independently reread allowance. Approval is not supply. Unknown/pending receipt: stop and reconcile before retrying.
- [ ] Recheck account/chain/config, supply eligibility, gas and allowance. Invoke M1 `supply` for the exact authorized amount; inspect the native dialog before approving. Persist hash, confirm receipt and reconcile; refresh diagnostics and compare wallet and supplied balance changes. A hash alone is not success.
- [ ] Recheck withdrawal eligibility, reserve liquidity, debt/collateral and simulation; invoke M1 `withdraw` for the authorized partial amount, then, only if separately authorized, the remaining balance. Inspect recipient/account and fees. Confirm receipts and compare wallet USDT, supplied balance and POL. Supply/withdraw each require their own native consent.
- [ ] Capture rejection/revert/pending outcomes and verify no duplicate submission. Stop if any address, account, chain, amount or fee differs from authorization. Record actual fees and each confirmed hash; mark unavailable or untested behavior honestly.

## Verified versus assumed (M2)
- Verified from current docs: SDK `init({ timeout })` initializes Nimiq; EVM uses injected `window.ethereum` independently.
- Verified from current docs: account requests, message signing, sends and chain switching have native confirmation; read methods are documented.
- Verified from current docs: Custom URL accepts a reachable URL; LAN HTTP works with secure-context limits; Nimiq testnet does not change EVM mainnet.
- Locally verified: see build/typecheck/lint/test results reported with the change; read-only guard and failure cases are automated.
- Unverified: installed host/version injection, event delivery, RPC breadth, native dialogs, balances and transaction execution on a real device.
- Assumed for deployment: operator supplies reachable HTTPS hosting and an SPA fallback; no deployment is included.
- `eth_sendTransaction` is documented, but runtime capability cannot safely be established by this no-send probe; no supported-method discovery API is documented.
