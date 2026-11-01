# NestFlow
Self-custodial Nimiq Pay mini-app: supply/withdraw USDT on Aave V3 (Polygon) with cost-aware previews. MIT license.

## Stack
React + TS + Vite, viem, TanStack Query, IndexedDB (idb), Vitest, Foundry/Anvil fork tests. Injected window.ethereum only. No backend, no private keys, no custom contracts.

## Hard rules
- All token math in bigint base units. Never floats for money.
- Resolve Aave Pool/USDT via PoolAddressesProvider and verify against aave.com/docs. Never hardcode addresses from memory. Keep them in src/config/aave.ts with source comments.
- Chain state is authoritative. Approval != supply. Tx hash != confirmation.
- Gas is POL. Detect insufficient POL early. Never promise gasless.
- Persist {account, chainId, txHash, action, status}; on reopen, reconcile receipts before any retry.
- Approve exact amount, not unlimited. Explain approvals in UI.
- Withdrawal checks: reserve state, pool liquidity, debt/collateral. Show timestamped diagnostics ("Checks passed as of <time>").
- Never copy: "bank", "insured", "guaranteed", "official Aave". Label estimates as estimates. Don't treat external aToken transfers as interest.
- Out of scope: borrowing, leverage, bridges, automation, AI features, multi-protocol, mainnet txs without my explicit OK.
- Resolution clarification: PoolAddressesProvider resolves the Pool; independently verify USDT identity using official documentation and reserve data. Do not assume the provider returns the USDT address.

## Workflow
Small commits. Run typecheck, lint, and tests before finishing. Report what's verified vs. assumed. Don't add dependencies without saying why.
- Tier gate: don't start a tier until the previous one passes its applicable tests and I confirm. T0 first, then T1, then T2. T3 never build unless I explicitly ask; blocked ideas also require an explicit change to the conflicting rule.
- Milestones classify work; they do not bypass tier gates. Required device/mainnet checks cannot pass from local tests or assumptions. Mainnet authorization remains separate.
- Every feature must have meaningful tests, failure-state handling, and a verified-vs-assumed note. Manual/documentation features need repeatable review or walkthrough evidence, not artificial code tests.

## Design bar
- Logos are in docs/brand/ and src/assets/. Do not redraw or alter them. Derive CSS color variables from docs/brand/BRAND.md.
- Mobile-first, one cohesive design system in CSS variables, distinctive NestFlow identity; no generic templates or gradients.
- Designed loading, empty, error, pending, success, disconnected and stale-data states; accessible contrast, keyboard, focus, labels, text equivalents and reduced motion.
- Explain costs and risks in plain language at the point of decision.
- Signature interaction: a live visual of USDT split between "in wallet" and "earning" responds to the spending preference. Two options are proposed in docs/BACKLOG.md; wait for my choice and the T1 gate before implementing one.
- Separate confirmed balances from proposed allocations; changing a preference never sends funds. Financial math stays bigint; normalized visual proportions are display-only.

## Product pointers
- docs/PLAN.md: build-affecting scope, audience, behavior, wording, historical scoring, risks and acceptance.
- docs/BACKLOG.md: de-duplicated features, milestones, tiers, risks, status, blocked ideas and signature choices.
- Read both before implementation. Historical research and deferred ideas do not authorize scope changes. No app code is authorized by the documentation task that created these files.
