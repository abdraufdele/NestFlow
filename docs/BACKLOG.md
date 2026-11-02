# NestFlow — feature and idea inventory

Baseline: 31 October 2026. All application features are unimplemented/unverified. Research/logo assets exist separately. This inventory covers NestFlow ideas; unrelated earlier alternatives are excluded records, not requirements. No startup/market work is authorized here.

Implementation update, 31 October 2026: the explicit M1 build request has now
produced the scaffold, core library and local tests. The table below retains the
planning baseline; current per-feature evidence and limitations are recorded in
[M1 verification](M1-VERIFICATION.md). M1's local checks, live configuration reads
and Polygon fork verification now pass (31 October 2026 follow-up). This does not
pass all of T0 or authorize M2/T1 screens.

## Table conventions

M1 core logic; M2 Nimiq Pay host probe; M3 UI; M4 recovery and diagnostics; M5 reporting and polish.

T0 core includes supply, withdraw, recovery, cost preview and prerequisites. T1 differentiators include spending preference, shortfall, withdrawal diagnostics, existing-position discovery, independent exit and signature visual. T2 polish. T3 later: never build unless asked.

Milestone is classification, tier is permission: finish/test all of the previous tier and obtain user confirmation before starting the next. Safety checks remain T0; their richer explanation is T1. Planned does not mean implemented or independently authorized. Blocked rows are rejected idea references, not executable work; T3 never overrides AGENTS.md.

Every feature needs meaningful tests (or repeatable manual review for documentation), failure handling and a verified-vs-assumed note. No test/device/mainnet evidence exists at this baseline.

## Feature inventory, subject to tier gates

| feature | user value | milestone | tier | risk | status |
|---|---|---|---|---|---|
| Verified Polygon/Pool/USDT/underlying/aToken configuration | Correct asset and destination | M1 core logic | T0 | Provider resolves Pool, not USDT; stale address | Planned/unverified |
| bigint parse/format, decimals, validation and rounding | Accurate money | M1 core logic | T0 | Precision loss; invalid/excess amount | Planned/unverified |
| Action-specific reserve state/cap checks | Avoid invalid requests | M1 core logic | T0 | Frozen/paused effects differ | Planned/unverified |
| Exact allowance/approval and required zero-reset support | Bounded executable permission | M1 core logic | T0 | Token behavior and allowance races | Planned/unverified |
| Supply builder, simulation and fresh preflight | Put approved USDT to work | M1 core logic | T0 | Wrong receiver; stale conditions | Planned/unverified |
| Partial/full withdrawal with liquidity/debt/collateral checks | Retrieve eligible funds | M1 core logic | T0 | Position balance is not unconditional access | Planned/unverified |
| Receipt/allowance/balance reconciliation | Know what completed | M1 core logic | T0 | Approval/hash mistaken for supply/success | Planned/unverified |
| POL sufficiency and gas estimates | Avoid funding dead ends | M1 core logic | T0 | Future fees uncertain; native sends differ | Planned/unverified |
| Entry plus estimated exit cost preview | Understand transaction economics | M1 core logic | T0 | Missing approval; unsupported conversion quote | Planned/unverified |
| Holding period, lower-rate, gross/net and fee break-even estimates | Judge whether earning is worthwhile | M1 core logic | T0 | APR/APY confusion; forecast presented as promise | Planned/unverified |
| Poor-economics/keep-in-wallet explanation | Avoid negligible-benefit actions | M3 UI | T0 | Manipulative defaults or misleading advice | Planned/unverified |
| Actual host/provider probe and connection | Use Nimiq Pay wallet | M2 Nimiq Pay host probe | T0 | Missing provider; desktop is not host evidence | Planned/unverified |
| Account/chain selection and native dialogs | Approve intended actions | M2 Nimiq Pay host probe | T0 | Denied permissions/switch; wrong account | Planned/unverified |
| USDT/POL/current-position reads | Understand confirmed funds | M2 Nimiq Pay host probe | T0 | Failed read treated as zero | Planned/unverified |
| Overview, supply preview, withdraw and activity screens | Complete the journey | M3 UI | T0 | Dead ends; missing confirmation | Planned/unverified |
| Loading/empty/error/pending/success/disconnected/stale states | Understand all outcomes | M3 UI | T0 | Ambiguous status or false success | Planned/unverified |
| Plain-language approval/cost/rate/risk copy | Informed decisions | M3 UI | T0 | Forbidden words or unsupported assurances | Planned/unverified |
| Mobile CSS-variable design system and NestFlow identity | Cohesive legible experience | M3 UI | T0 | Contrast/layout failures; generic styling | Planned/unverified; logo outside project |
| Core keyboard/focus/labels/text equivalents/reduced motion | Accessible tasks | M3 UI | T0 | Color/motion-only meaning | Planned/unverified |
| Durable account/chain/hash/action/status journal | Recover interruptions | M4 recovery and diagnostics | T0 | Storage denial; mixed-account records | Planned/unverified |
| Reopen reconciliation and allowance-aware resume | Avoid duplicate transactions | M4 recovery and diagnostics | T0 | Timeout interpreted as failure | Planned/unverified |
| Reject/revert/replace/unknown/pending and duplicate-click handling | Recover understandable failures | M4 recovery and diagnostics | T0 | Premature retry/success | Planned/unverified |
| Account/chain namespacing and cache invalidation | Prevent stale actions | M4 recovery and diagnostics | T0 | Async races and mixed balances | Planned/unverified |
| Read freshness, RPC failures/retries and manual refresh | Current observations | M4 recovery and diagnostics | T0 | Endless loading; stale preflight | Planned/unverified |
| Confirmed base activity and correct explorer links | Inspect completed actions | M5 reporting and polish | T0 | Wrong network/unconfirmed event | Planned/unverified |
| Rate provenance and actual/forecast separation | Understand data limits | M5 reporting and polish | T0 | Stale/incentive rate conflation | Planned/unverified |
| Unit/state/fork verification suite and evidence | Establish correctness | M1 core logic | T0 | Fork result overstated as host/mainnet proof | Planned/unverified; host tracked in M2 |
| Static HTTPS delivery and device smoke check | Open in intended host | M2 Nimiq Pay host probe | T0 | Deployment is not execution proof | Planned/unverified |
| Explicitly authorized mainnet supply/partial/full withdrawal | Establish live execution | M2 Nimiq Pay host probe | T0 | Real funds; separate authorization | Awaiting explicit OK; not executed |
| Setup/usage README, MIT file, limitations and verification matrix | Reproduce core flow | M5 reporting and polish | T0 | Missing instructions/overclaims | Planned/unverified |
| Five observed task sessions and feedback fixes | Validate clarity/failures | M5 reporting and polish | T0 | Coached activity presented as adoption | Planned/unverified; consent required |
| Account/chain-scoped spending preference | Keep intended wallet liquidity visible | M1 core logic | T1 | Preference mistaken for lock/guarantee | Planned/unverified; gated by T0 |
| Manual payment-shortfall calculator and withdrawal handoff | Retrieve only extra eligible USDT | M1 core logic | T1 | Double counting; insufficient withdrawability | Planned/unverified; payment separate |
| Existing matching position discovery/import display | Access funds supplied elsewhere | M2 Nimiq Pay host probe | T1 | External transfers/incomplete history | Planned/unverified; gated by T0 |
| Detailed timestamped withdrawal diagnostics | Explain current constraints | M4 recovery and diagnostics | T1 | Checks mistaken for future guarantee | Planned/unverified; gated by T0 |
| Independent exact-market/account exit instructions | Alternative access if app unavailable | M5 reporting and polish | T1 | Alternative host/interface compatibility | Planned/unverified; gated by T0 |
| Signature A: segmented split bar plus numeric preference | Precise wallet/earning comparison | M3 UI | T1 | Preview mistaken for executed allocation | Choice pending; exclusive with B |
| Signature B: paired balance vessels plus numeric preference | Distinctive spatial comparison | M3 UI | T1 | Area/motion implies false amounts/transfer | Choice pending; exclusive with A |
| Historical earnings reconstruction with principal/transfer separation | Honest performance history | M5 reporting and polish | T2 | Missing logs; aToken transfer mislabeled yield | Planned/unverified; disclose unavailable history |
| Detailed activity timeline and earnings charts | Review behavior over time | M5 reporting and polish | T2 | False precision/fabricated history | Planned/unverified; gated by T1 |
| CSV/activity export with provenance | Keep useful records | M5 reporting and polish | T2 | Privacy/CSV injection/tax implication | Planned/unverified; gated by T1 |
| Extended accessibility/mobile usability review | Find remaining task barriers | M5 reporting and polish | T2 | Cosmetic-only review | Planned/unverified; baseline accessibility T0 |
| Performance and public-read resilience polish | Faster reliable use | M5 reporting and polish | T2 | Optimization changes correctness | Planned/unverified; gated by T1 |
| Read-only clearly labeled sample walkthrough | Learn without funding | M3 UI | T2 | Sample mistaken for live/real usage | Planned/unverified; gated by T1 |
| Broader 10–15 tester cohort and voluntary return-task observations | Assess recurring usefulness | M5 reporting and polish | T2 | Artificial activity/identifying analytics | Planned/unverified; no backend |
| Submission description, demo script/video and review checklist | Review actual functionality | M5 reporting and polish | T2 | Claims outrun evidence; rules change | Planned/unverified; gated by T1 |
| Changelog, dependency review, vulnerability contact and manual incident runbook | Maintain dependable releases | M5 reporting and polish | T2 | Implied security certification | Planned/unverified; gated by T1 |
| Localization beyond plain English | Serve evidenced language need | M3 UI | T3 | Mistranslated financial terms | Deferred; never build unless asked |
| Additional goals/manual bill earmarks | Organize discretionary funds | M3 UI | T3 | Scope growth; earmark mistaken for lock | Deferred; never build unless asked |
| Read-only external yield/DeFiLlama context adapter | Sourced rate context | M5 reporting and polish | T3 | API migration; rate conventions; stale quote | Deferred; never build unless asked |
| Read-only Aave/Fluid same-token comparison | Understand alternative observations | M5 reporting and polish | T3 | Different costs/risks; no execution adapter | Deferred; research/display only if asked |
| Aave V4 feasibility study, no integration | Assess future version deliberately | M1 core logic | T3 | Deployment mismatch; not drop-in V3 | Deferred; study only if asked |
| Foreground-only operational/rate notices | Explain fresh observations | M4 recovery and diagnostics | T3 | No reliable background delivery | Deferred; no backend/automation |
| Freelancer/business reporting or embedded-wallet product study | Assess future direction | M5 reporting and polish | T3 | New audience/scope | Deferred; study only if asked |

## Signature choice

Choose exactly one; this task authorizes neither implementation.

**A — split bar (recommended):** two labeled segments, "in wallet" and "earning", numeric balances, a numeric preference input and keyboard-accessible slider. Confirmed allocation stays separate from "after proposed supply" preview. Compact and easier to compare precisely.

**B — paired vessels:** flat geometric containers inspired by NestFlow's flowing curves, with labeled balances and normalized fill levels. A separate preview responds to the same numeric preference. More distinctive, but harder to convey precise quantities. No gradients, decorative transfers or perpetual growth animation.

Both must handle zero total, invalid/above-balance preference, stale/missing reads, account changes, loading, mobile layout and reduced motion. Provide a text equivalent and numeric/keyboard input. Existing supplied funds remain supplied when moving the control; an increased wallet target can show a withdrawal need. Preview response is local only; confirmed transactions change actual balances. Financial amounts are bigint; proportions are display-only. Test interactions/failures and obtain user choice plus T1 approval first.

## Flagged idea references — not executable work

Milestones below are conceptual classification only. Never schedule blocked records without an explicit scope/policy change. T3 does not grant permission.

| feature | user value | milestone | tier | risk | status |
|---|---|---|---|---|---|
| Backend/indexer/database/API proxy/remote analytics | History/operational support | M5 reporting and polish | T3 | No-backend conflict | Blocked by AGENTS.md |
| Background email/push alerts and automated monitoring | Notify while away | M4 recovery and diagnostics | T3 | Backend/automation | Blocked as discussed; foreground alternative above |
| Recurring deposits, auto-sweep/debits/rebalance/yield switching | Less manual work | M1 core logic | T3 | Automation and fund movement | Blocked by AGENTS.md |
| Borrowing/leverage/credit or liquidation-management product | Borrowed liquidity | M1 core logic | T3 | Borrowing/leverage out of scope | Blocked; read-only debt safety checks stay core |
| Bridges/cross-chain/multi-network supply or asset swaps | Broader access | M1 core logic | T3 | Bridge and single-asset/network scope | Blocked by current rules/scope |
| Fluid/Morpho/Spark/Compound adapters/auto-routing | More strategies | M1 core logic | T3 | Multi-protocol execution | Blocked by AGENTS.md |
| Aave V4 execution on another chain/market | New protocol version | M1 core logic | T3 | Outside V3 Polygon; different accounting | Blocked by current scope |
| Custom vault/custody/pooled funds/locking/token/yield-fee contract | New fund/fee mechanics | M1 core logic | T3 | Custody/private-key/custom-contract rules | Blocked by AGENTS.md |
| ERC-4337 smart account/paymaster sponsorship | Reduce gas friction | M2 Nimiq Pay host probe | T3 | Different account/provider/backend assumptions | Blocked as proposed; POL-fee requirements remain explicit |
| Automatic gas top-up/treasury user payments | Remove funding step | M2 Nimiq Pay host probe | T3 | Automation/private keys/backend/fund authorization | Blocked as proposed |
| AI assistant/tutor/recommendations/agent | Explain/automate decisions | M3 UI | T3 | AI explicitly excluded | Blocked by AGENTS.md |
| WalletConnect/alternative wallet SDK/seed import/key storage | Broader wallets | M2 Nimiq Pay host probe | T3 | Injected-only/private-key conflict | Blocked by AGENTS.md |
| Native NIM staking/validator/reward/tax dashboard | Another earning mechanism | M1 core logic | T3 | Different asset/provider/product | Excluded; not NestFlow scope |
| Social savings/challenges/leaderboards/streaks/cashback/referrals | Social engagement | M3 UI | T3 | Separate scope; many require backend/automation | Excluded competitor/inspiration ideas |
| Automatic bill/spending detection or atomic withdraw-and-pay | Payment convenience | M1 core logic | T3 | Unsupported visibility/automation/custom execution | Blocked as proposed; manual shortfall retained |
| Remittance/merchant reconciliation/bill splitting/round-ups/private payments/on-off-ramp platform | Other hackathon problems | M1 core logic | T3 | Separate products; may violate rules | Excluded earlier alternatives |
| Essential-bill protection/unconditional liquidity or returns/deposit-protection positioning | Reassurance | M3 UI | T3 | False assurance/forbidden wording | Blocked; preference is planning only |
| Unlimited allowance or auto-retry after uncertain receipt | Fewer clicks | M4 recovery and diagnostics | T3 | Exact-approval/reconciliation conflict | Blocked by AGENTS.md |
| Mainnet transactions without explicit user OK | Live evidence | M2 Nimiq Pay host probe | T3 | Unauthorized real funds | Blocked until explicit OK |

## Future verification record

For every implemented feature record: feature/tier; test command or review walkthrough; expected/observed result; failure cases; local/fork/device/mainnet environment; verified facts; remaining assumptions; evidence reference. No app, fork, device or mainnet checks have run. Signature choice, tier confirmation and mainnet authorization are separate decisions.

## M3 scope update — 1 November 2026

The explicit M3 request authorizes the listed UI, existing-position reads, spending preference and signature interaction without asserting funded-device T0/T1 completion. Other milestones and unlisted tiers remain deferred.

Two signature options:
- **A — split bar (selected and implemented):** labelled gold "in wallet" and teal "earning" segments, exact numeric balances, numeric target input plus keyboard slider. Confirmed balances occupy their own panel; the bar is explicitly "After proposed supply".
- **B — paired vessels (deferred):** two flat containers with normalized fill levels and the same exact labels/input. More drawing and edge-case layout work, with less precise visual comparison.

The user asked to implement the simpler option, selecting A. Dragging changes only a local plan. Above-wallet targets indicate a separate withdrawal need; existing supplied funds never move on slider input. Zero/missing/error/stale/account-change states and reduced motion are covered by the M3 tests. Monetary calculations use existing bigint functions; normalized visual percentages alone use Number.

Evidence and remaining assumptions: [M3 test results](m3-test-results.md). Earlier "choice pending" and no-implementation entries above are the historical planning baseline, superseded only for the explicit M3 scope.


## M4 scope update — 2 November 2026

Explicit user request authorizes only these M4 features despite the historical
tier inventory. It does not pass funded-device tier gates or authorize mainnet.

- Done: durable launch reconciliation, replacement-hash recovery and status UI;
  unknown/pending blocks retry; approval remains separate after supply rejection.
- Done: timestamped liquidity, paused/frozen and debt/collateral diagnostics;
  manual payment-shortfall calculator; sourced independent-exit instructions.
- Done: optional on-chain Aave WPOL/USDT estimate; net/break-even require all
  fee estimates. Missing quote never prevents an eligible withdrawal.
- Done: device-local spending preference and holding period in IndexedDB,
  no addresses in the preference store; explicit reset retains the tx journal.
- Done (small fix a): stale notice only after a connected session becomes stale;
  a stale first read reports unavailable current balances instead.
- Done (small fix b): friendly rejection text, raw 4001 retained in error logs.
- Done (small fix c): Diagnostics link appears only in a Vite dev build.
- Done: private funded-test switch documented with hard 5 USDT per-action cap;
  remains off in this work and must remain off publicly.

Evidence and limits: [M4 verification](m4-test-results.md).

## Deferred polish — cleared in M5b

- Done: one short tagline, “Room to spend.”
- Done: filled primary Connect button; refresh remains secondary.
- Done: shared spacing/type/motion and state surfaces; review evidence in [M5b verification](m5b-test-results.md).
- Done: header already uses supplied logo B, byte-identical to docs/brand master. Compared against Nimiq Pay’s hexagon icon; retained unchanged, no redraw.

## M5a scope update — 2 November 2026

Explicit five-step request authorizes M5a only; M1–M4 behavior and remaining funded-device limits are retained. No new dependency, send flag, funding, deployment or mainnet transaction.

- Done locally: confirmed Supply/Withdraw history at head minus one, independently read confirmed aToken balance, timestamps and Polygon transaction links. Last 2,000 blocks only, 500-block RPC pages; errors disclose unavailable history. External transfers and incomplete coverage never become interest. Earnings reconstruction remains unavailable; no chart or invented lifetime performance.
- Done locally: CSV of confirmed events only, exact base units/decimal amounts, account/network/contracts/block/hash/log provenance, incomplete-history warning and not-tax/accounting-advice header. Formula prefixes neutralized.
- Done locally: one-hour maximum source update age for both oracle feeds, zero/future/invalid rounds rejected. Unsupported source timestamp reads make quote/net/break-even unavailable. Withdrawal checks stay usable. Current USDT source lacks latestRoundData in the verified fork, so quote is conservatively unavailable.
- Done: runtime npm audit zero; 15 dev-only findings triaged, compatible audit fix found dependencies already up to date. Breaking upgrades/--force deferred. SECURITY.md, MIT LICENSE review and repeatable tracked-history credential scan. Personal Git metadata finding and the authorized post-M5a rewrite/backup procedure are documented.
- Done locally: lazy diagnostics/history with loading/reload fallback. About 20 kB diagnostics plus history chunks load separately; main chunk remains about 591 kB and still triggers Vite's warning. Further dependency chunk tuning deferred as higher scope/risk.

Evidence and exact commands/results: [M5a verification](m5a-test-results.md). Remaining T2 items, observed-user sessions, full accessibility/device tests and real sends remain deferred. Backup/pre-rewrite intentionally preserves original metadata; only rewritten main is intended to be email-clean.

## M5b scope update — 2 November 2026

Explicit four-step request only. Done locally: deferred screen polish, README/changelog, wording sweep with change list and release checklist. [M5b verification](m5b-test-results.md) records checks and evidence; [wording review](WORDING-REVIEW.md) lists edits. [Release checklist](RELEASE-CHECKLIST.md) leaves funded-device flow, redeploy, final rules/scoring review and demo recording open. No funds, sends, send flag, deployment, publication, new dependency or further milestone. Historical inventory rows above remain baseline records, not current completion status.
