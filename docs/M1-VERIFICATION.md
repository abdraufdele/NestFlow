# M1 core implementation

M1 only. The existing README, AGENTS.md, product specification and all brand
assets are preserved. The README's planning status is intentionally unchanged
at the user's request. No M2 host probe, M3 screens or signature visual was built.
The explicit M1 request includes the pure T1 spending/shortfall calculations;
it does not open the remaining T1 gate.

## Reproduce

Use Node >=22.19.0 and npm. From `C:\Users\PC\Projects\NestFlow`:

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
$env:POLYGON_RPC_URL = '<your Polygon HTTPS RPC endpoint>'
npm run verify:config
npm run test:fork
```

Install **Foundry**, including `forge` and `anvil`, and add its bin directory to
PATH: https://getfoundry.sh/introduction/installation/ . On Windows use the
official Windows binaries, or the documented supported shell setup. Both tools
must be callable from the shell running npm. Foundry also needs to obtain the
configured Solidity 0.8.30 compiler. The fork RPC must support historical state;
`POLYGON_FORK_BLOCK` optionally selects an explicit reproducible historical block.
The runner reports the observed block. Do not change reserve flags to force a pass.

Scripts read environment variables directly; `.env.example` is documentation,
not an auto-loaded secret file. No RPC credential is bundled into the frontend.
On this PC npm required `NODE_OPTIONS=--use-system-ca` to trust the Windows CA
store. Certificate checks were retained. Sandbox restrictions blocked esbuild's
directory traversal and tsx's OS user lookup; checks were run outside that sandbox.

## Implemented behavior and test evidence

| Feature | Evidence and failure handling | Scope/limit |
|---|---|---|
| Scaffold | React/TS/Vite, TanStack Query provider, ESLint, Vitest, MIT, lockfile; typecheck/lint/build | Minimal static M1 placeholder only |
| Configuration | `src/config/aave.test.ts`; provider resolves Pool; reserve membership, underlying/aToken relationships, code, symbol and three decimal observations | Official address-book anchors reviewed; live on-chain call still required |
| Reserve/account reads | `src/lib/aave.rpc.test.ts`; common observation block/time, treasury-inclusive supply cap, cash liquidity, aggregate debt and collateral flag; read errors propagate | RPC fixtures in unit tests; no device evidence |
| Eligibility | `src/lib/aave.test.ts`; frozen supply vs withdrawal, inactive/paused, cap boundary, balance/liquidity, zero/dust/max; exact withdrawal simulation for account constraints | Successful checks describe an observation, not future execution |
| Actions | Real viem encoding with RPC fixtures; exact/reset approval, allowance reread, fresh preflight, gas estimate/POL sufficiency, account/chain changes, refusal and rejection | Each action separately persisted/confirmed; on-chain behavior awaits fork |
| Math/economics | `src/lib/math.test.ts`; bigint parse/format, spending split, supplyable amount, simple APR scenarios, signed net estimates, ceiling break-even and shortfall | 365-day simple APR in bps; gross floors; fees ceil; no compounding or price parity assumption |
| Costs | `costPreview` keeps entry and estimated exit POL wei; conversion only with explicit USDT/POL quote source/time | Future gas/rates and conversion freshness are caller inputs, not live oracles |
| Recovery | `src/lib/txStore.test.ts`; IndexedDB reopen, atomic duplicate guard, storage denial/failure, timeout, two confirmations, canonical block, wrong chain, revert/reject/unknown | Unit tests use fake-indexeddb; actual browser storage durability remains unverified |
| Replacements | Verify original sender/nonce and calldata/value/destination; explicit replacement hash; reprice can confirm, cancellation rejects original action | If original metadata or hash was never observed, remain unknown; never infer failure from absence |
| Wallet construction | `src/lib/wallet.test.ts`; injected EIP-1193 only, missing-provider error | Host compatibility/connection UI belongs to M2 |
| Polygon fork | `test/PolygonFork.t.sol` plus `scripts/test-fork.ts`; isolated Anvil, exact approval, supply, partial/full withdrawal, viem actions and journal receipts | Implemented, not executed: required tools/RPC missing |

## Recovery contract for the later UI

Call `openTxStore()` and `store.reconcile(client, account, chainId)` on load;
`begin` refuses actions until this has happened. Every action rechecks receipt
state before obtaining the account/chain lock. Approval confirmation is not
supply confirmation. A hash is only submitted; two confirmations and matching
canonical block hash are required. No automatic resubmission occurs.

An interrupted `idle` preflight remains locked. It has not entered the wallet;
after reconciliation the caller may explicitly `cancelPreflight(record)` before
retry. This uses an atomic expected-id/status check, so a concurrent wallet request
cannot be unlocked. An interrupted signature without a hash becomes `unknown`;
it cannot safely be cleared by receipt absence. A known replacement hash can be
passed to `reconcileReplacement`; original transaction metadata must have been
observed from RPC. Missing metadata keeps the lock. Records are account/chain
scoped and retain the latest attempt, not a complete activity index/history.

IndexedDB failure before signing disables the wallet call. Failure after a hash
returns an explicit do-not-retry error including the known hash. A durable older
awaiting-signature record continues to block if even the unknown-state write fails.
Local-fork mode checks BOTH reader and sender report Anvil; sharing chain 137 alone
does not authorize a real Polygon wallet. Mainnet mode requires explicit caller
authorization; no mainnet transaction or wallet connection was performed here.
Previously confirmed/reverted receipts are rechecked on reopening as well; a
later canonical-block mismatch returns the attempt to unknown and blocks retries.

## Observed environment blockers

`npm run test:fork` was invoked and exited 1, reporting missing `forge`, `anvil`
and `POLYGON_RPC_URL`. No skipped fork test is counted as passing.
`npm run verify:config` was attempted with a temporary public Polygon endpoint
and failed with `HttpRequestError`. Two other public endpoints failed DNS lookup.
Consequently Pool/reserve/aToken/decimals have source and unit-test evidence,
but are **not verified live on-chain in this environment**. Host/device and
mainnet results are also unverified. Final local command results are recorded
below after the last implementation changes.

## Final local verification, 31 October 2026

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 49 tests across six files.
- `npm run build`: passed, Vite 7.3.7 production bundle.
- `npm run verify:config`: failed prerequisite with no configured RPC; a separate
  public-RPC attempt failed connectivity. No live configuration result is claimed.
- `npm run test:fork`: failed prerequisite, missing forge/anvil and RPC environment.
- Both logo masters match the original research assets by SHA-256. The primary
  master and `src/assets/nestflow-logo.png` also have identical SHA-256 hashes.

Review regressions were observed failing before their fixes: duplicate submission
requested two signatures, mixed Anvil/mainnet clients permitted a send, active
preflight was unlocked, replacement recovery was absent, and old confirmations
were not rechecked after reopening. Their final regression tests pass. The
independent read-only review reported no further important defects in those fixes.
This is local evidence, not an executed fork, device test or mainnet assessment.

## Foundry installation follow-up, 31 October 2026

At the user's request, installed official Foundry v1.8.7 Windows amd64 binaries
in `C:\Users\PC\.foundry\bin` and added that directory to the Windows user PATH.
Updated Ubuntu WSL from v1.3.5 to v1.8.7 in
`/home/abdraufdele/.foundry/bin` and configured the login PATH in `.profile`.
Both release archives were verified against the official GitHub release SHA-256
digests. `forge`, `anvil`, `cast`, and `chisel` report v1.8.7 on both platforms;
a fresh WSL login shell also resolves the new binaries. Previous WSL binaries
are retained in `.foundry/backup-before-v1.8.7-20261031-221610`.

Windows Anvil passed a local-only startup/chain-137 RPC smoke test. No transaction
was sent. A rerun of `npm run test:fork` now reports only the missing
`POLYGON_RPC_URL` prerequisite. `forge build` additionally failed DNS resolution
for `https://binaries.soliditylang.org/windows-amd64/list.json` while trying to
obtain the configured Solidity 0.8.30 compiler. Foundry installation is verified;
compiler acquisition and actual fork/config verification remain pending.

## Successful RPC/fork follow-up, 31 October 2026

The user supplied the RPC endpoint in ignored `.env`; it was loaded into the
check processes without printing the credential. The following results supersede
the earlier environment blockers:

- `npm run verify:config`: **passed**, Polygon block **96520526**, chain 137,
  resolved Pool/provider and supported USDT0 underlying/aToken/debt token, 6 decimals.
- `npm run test:fork`: **passed**, fork block **96520735**, Solidity **0.8.30**.
  Foundry: **1 passed, 0 failed, 0 skipped**. Actual viem exact approval, supply,
  partial/full withdrawal and IndexedDB receipt reconciliation also passed on Anvil.
- `npm test`: **49 passed** across six files, rerun during this follow-up.
- `npm run typecheck` and `npm run lint`: **passed** after runner changes.

The execution exposed and corrected three harness issues: the 2-second startup
probe timeout was being reused for lazy fork reads; `partial` was a Solidity
reserved identifier; and the round-trip assertion allowed only one base unit
of loss. A trace at block 96520635 showed supply mint flooring and partial scaled
burn ceiling yielding **9999998** base units back from **10000000** supplied.
The Solidity test now derives its exact expected mint/burn/full-withdraw amounts
from the reserve liquidity index. The multi-block viem check bounds rounding loss
by `ceil(2 * liquidityIndex / RAY)` rather than an arbitrary one-unit tolerance.
Both partial and full balances, receipt states and zero final aToken balance
remain checked. The fresh fork run passed these assertions.

M1's requested local/on-chain-read/fork checks pass. This does not establish
Nimiq Pay host/device readiness or authorize later tiers. No mainnet transaction
was sent; fund movement occurred only inside isolated fork state.
