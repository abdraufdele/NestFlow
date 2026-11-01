# NestFlow — product decisions

Baseline: 31 October 2026. Specification only: no application exists in the target project. Research and logos exist in the earlier research workspace. This file excludes market, monetization, and startup strategy.

## Authority and scope

AGENTS.md governs implementation; this file defines behavior; BACKLOG.md inventories features and choices. Historical research does not authorize deferred features or spending.

Build an independent self-custodial Nimiq Pay Earn mini-app for USDT supply/withdrawal through existing Aave V3 contracts on Polygon (chain 137). Initially one asset, network and protocol. Injected window.ethereum only; no backend, private keys, custody, custom contracts, borrowing, leverage, bridges, automation, AI or multi-protocol execution. Earlier optional backend/indexer proposals are superseded.

Stack: React, TypeScript, Vite, viem, TanStack Query, IndexedDB via idb, Vitest, Foundry/Anvil fork tests. Explain new dependencies before adding them. Static HTTPS delivery; no mandatory server or password account.

## Audience and job

Existing Nimiq Pay users who hold supported Polygon USDT, understand lending risk, and have discretionary funds they do not need immediately. Existing matching Aave holders should access eligible withdrawals without a new deposit. Freelancers/small operators qualify only if they fit this audience; no separate business product is authorized.

Job: decide whether supplying is worthwhile after costs, retain a chosen wallet spending amount, understand the position, and retrieve eligible funds without confusing transaction states. Do not target essential imminent bill money or expand into fiat onboarding.

## Core journey

1. Connect/preflight: detect provider/host, account and chain; read USDT, POL and relevant account constraints. Distinguish missing provider, permission rejection, wrong chain and failed reads. Failed read is not zero.
2. Overview: confirmed in-wallet and supplied USDT, variable rate with source/time, freshness. Existing-position discovery follows the T1 gate.
3. Supply preview: exact amount, remaining wallet balance, approval if needed, entry fees, estimated exit cost, holding period and estimated earnings. Explain poor economics.
4. Confirm: native wallet request, approval receipt and allowance reconciliation, fresh validation, supply request, receipt and refreshed position. Mainnet actions require explicit authorization.
5. Withdraw: partial/full amount, mandatory account/reserve/liquidity/gas checks and simulation where supported, receipt and refreshed state. T1 adds detailed diagnostics, not basic safety.
6. Activity/recovery: restore pending actions; distinguish confirmed activity from pending/unknown states and forecasts. Rich reporting follows later.

## Money, rates and configuration

- Token and monetary calculations use bigint base units. Parse decimal strings at boundaries, verify decimals, document rounding, and use scaled integer/fixed-point rates. No floating-point money math.
- PoolAddressesProvider resolves the Pool, not the USDT token identity. Preserve the existing rule while independently verifying the token against official documentation and reserve data. Verify underlying/aToken, chain and reserve eligibility. Configuration provenance belongs in src/config/aave.ts; no addresses from memory.
- Recheck action-specific reserve flags, cap headroom, allowance, balances, gas and account debt/collateral. Frozen and paused states have different action effects.
- Gas is POL. Detect shortages early. Ordinary mini-app EVM calls do not inherit native Nimiq Pay USDT-send gas abstraction. Do not claim gasless execution.
- Preview approval when required, supply, and estimated future withdrawal costs. Existing allowance may remove an approval step. Distinguish current estimates from uncertain future gas/rates. Label any POL/USDT conversion quote with source/time or disclose unavailable conversion.
- Show holding period, lower-rate scenario, gross earnings, fees, approximate net result and fee break-even. Verify APR/APY conventions. Historical DeFiLlama snapshots are not current quotes; separate base rates from incentive assumptions.
- Fee break-even does not compensate for investment risk. Small balances/short periods may be uneconomic. Do not promise a higher underlying rate than the same reserve elsewhere.
- Optional external data is contextual: its failure must not disable otherwise valid withdrawals. Never infer account withdrawability from reserve cash or TVL alone.

## T1 differentiation

- Spending preference: account/chain-scoped target to retain in the wallet. Planning only; no lock, insurance, automatic transfer or guaranteed availability.
- Shortfall: max(0, desired payment minus confirmed wallet USDT), in base units. Offer an eligible user-approved withdrawal; explain insufficient withdrawable funds. Later payment remains separate. No automatic bill detection or atomic withdraw-and-pay claim.
- Existing positions: discover the exact supported aToken position, including positions created elsewhere. Missing history must not prevent eligible withdrawals.
- Diagnostics: account position, reserve state, liquidity, debt/collateral, gas and simulation where supported. Show observation block/time and specific reasons. Successful checks do not ensure future execution.
- Independent exit: verified instructions for the exact market/account through compatible alternative access. Mark unverified routes; never require seed export or an additional integrated wallet provider.

## Signature interaction: choice pending

Live visual splits USDT between "in wallet" and "earning" and responds to the spending preference. BACKLOG.md contains option A (split bar) and B (paired vessels). Wait for the user's choice and T1 authorization.

Show confirmed balances separately from "after proposed supply" preview. A slider cannot reallocate an existing supplied position. Raising the wallet target above current wallet funds can indicate withdrawal need; it does not move funds. No transaction on dragging. Handle zero total, stale/missing reads, invalid/out-of-range values and account changes. Provide numeric/keyboard input, text equivalents and reduced motion. Financial amounts stay bigint; normalized proportions are display-only. No fabricated earnings animation.

## Recovery and reporting

- Persist {account, chainId, txHash, action, status} immediately after a hash. Namespace preferences and reads by account/chain; invalidate stale asynchronous responses.
- Approval != supply; hash != confirmation. Reconcile receipts, allowance and balance before retry. Never resend automatically on timeout.
- Handle rejected/reverted/replaced/unknown/pending states, duplicate clicks, account/chain changes, RPC failure, stale data and interrupted sessions.
- IndexedDB denial/failure must produce a clear recovery limitation, not false durability. Local storage is never balance authority.
- Separate supplied balance, confirmed deposits/withdrawals, forecasts and reconstructed historical earnings. External aToken transfers and incomplete logs must not become interest. If reconstruction fails, disclose limits and preserve position/withdrawal access.
- Exports retain provenance/incompleteness warnings; do not promise tax compliance. No backend to bypass history limits.

## Design and wording

Mobile-first cohesive CSS-variable design system using NestFlow's teal/gold flowing-N and seed identity. No generic templates or gradients; existing raster assets do not require gradients in UI. Copy/verify assets only in a later authorized implementation task.

Design loading, empty, error, pending, success, disconnected and stale states. Include accessible contrast, touch targets, labels, focus, keyboard input, screen-reader text and reduced motion. Put plain-language costs and risks at the decision point.

Preserve forbidden promotional copy: "bank", "insured", "guaranteed", "official Aave". Label estimates. No risk-free, gasless, highest-yield, globally novel, automatic reserve or guaranteed-access claims. Use "Checks passed as of <time>" only for checks actually performed. Explain NestFlow is independent and Aave provides lending infrastructure.

## Competition constraints and historical findings

Research baseline, to reverify before submission: Earn covers staking/yield; meaningful USDT/NIM integration, public MIT repository and functioning mainnet entry are required. A mockup/logo is not integration. No mandatory deposit size or test count was established. Mainnet verification still needs explicit OK.

| Scoring area | Historical weight | Build consequence |
|---|---:|---|
| Functionality, reliability, usefulness | 45 | Complete useful supply/withdrawal, costs and recovery |
| Nimiq Pay/Nimiq integration | 25 | Actual installed host and native approval evidence |
| Real usage | 15 | Genuine tasks and consented feedback; no manufactured volume |
| Design/UX | 10 | Cohesive accessible mobile flows |
| Builder promotion checklist | 5 | Reproducible instructions/demo and current checklist |

Piggy submitted savings/optional yield; its current repository describes Polygon Aave V3, possibly including later work. BALLAST submitted Base Aave yield with conversion. Native NIM reporting/staking entries are adjacent. Aave, Polygon, goals, calculators, charts and gas assistance are not exclusive innovations. Metadata/current repository claims do not prove judged functionality. Differentiate through demonstrated cost clarity and recoverable workflows.

Winner lessons are interpretations, not causal scorecards: NimJump/NimQuest emphasized verification; Nimiq Space recurring shared activity; Knock integrated payments; Blacktop a specific user workflow; NIMIQ.kids observed household use; PROOF a recurring learning job. Do not import unrelated features to imitate winners.

## Milestones and acceptance

Milestones classify work; tiers authorize it. T0 spans M1–M5 and must pass applicable tests with explicit user confirmation before T1. T1 similarly precedes T2. T3 never starts unless requested; blocked ideas need an explicit policy change. Required assumptions cannot count as passing evidence.

| Milestone | Acceptance focus |
|---|---|
| M1 core logic | Verified configuration, bigint arithmetic, allowance/supply/withdraw, cost model, meaningful unit/fork tests |
| M2 Nimiq Pay host probe | Actual device provider/chain/account/balance/dialog evidence; funded tests separately authorized |
| M3 UI | Complete T0 screens/states first; T1 preference/shortfall/signature after gate and choice |
| M4 recovery and diagnostics | T0 durable reconciliation/failure handling; T1 detailed diagnostics after gate |
| M5 reporting and polish | Reliable base activity, docs, useful authorized T2 reporting/polish and submission evidence |

M1 is local/fork work; no host readiness claim until M2. No tier passes with required device/mainnet checks assumed. Continue only independent work authorized within the current tier while blocked.

Every feature needs meaningful tests, failure-state handling and a verified-versus-assumed note. Manual/documentation features use repeatable walkthrough/review evidence rather than artificial code tests. When code exists, run typecheck/lint/tests and production build. This documentation task only needs content/policy/table/line-limit checks.

## Material risks

Low returns: show costs honestly. Stale data, incorrect configuration and APR/APY conventions: retain provenance and fail safely. Protocol/stablecoin/liquidity/collateral/frontend risks: specific explanations, no inherited audit claims. POL friction: preflight, no unproven sponsorship. No-backend history limits: explicit incompleteness. Host variation: real device evidence. Easy-to-copy interface: demonstrate workflow benefit. Time pressure: cut optional scope, not withdrawal or recovery verification.

## Sources

- https://nimiq.dev/mini-apps/features/evm-tokens
- https://nimiq.dev/mini-apps/tutorials/mini-app-tutorial
- https://nimiq.dev/mini-apps/faq
- https://aave.com/docs/aave-v3/smart-contracts/pool
- https://aave.com/help/supplying/withdraw-tokens
- https://miniappscompetition.com/scoring
- https://miniappscompetition.com/rules
- https://github.com/roadsidedev/piggy-nimq

Historical evidence remains under C:\Users\PC\OneDrive\Documents\ChatGPT\Nimiq Hackathon: plan.md, aave-earn-build-brief.md, aave-earn-market-research-2026-10-26.md, submission-audit/catalog.json and submission-audit/winner-network-audit/REPORT.md. Evidence does not restore superseded scope. No live rule/rate revalidation was performed in this documentation task.
