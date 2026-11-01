# NestFlow UX contract
## Business context sources
| Concern | Source | UI consequence |
|---|---|---|
| Scope, permission, money, wording | AGENTS.md; docs/PLAN.md; explicit M3 request | Exact separate approvals; no mainnet sends; estimates labelled |
| Identity and lifecycle | User-reported Android findings; src/lib/wallet.ts | Connect, check/switch, reread each open; clear stale identities |
| Transactions and persistence | src/lib/aave.ts; src/lib/txStore.ts | Reconcile before retry; pending stays locked; hash is not confirmation |
| Costs | docs/PLAN.md; src/lib/math.ts | No invented POL/USDT quote or net result |
## Canonical UI Map
| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | App fields and M1 parseAmount | src/App.tsx; src/lib/math.ts | Native text and range; numeric keyboard | e2e/flow.spec.ts |
| Scrollbar | Global stylesheet | DESIGN.md; src/styles.css | Standards plus WebKit; system forced colors | e2e/flow.spec.ts |
| Toast | Inline status region | src/App.tsx | Status, warning, success; no ephemeral-only errors | e2e/flow.spec.ts |
No tables, selects, date pickers, CRUD or modal dialogs are used in M3.
## Flow ledger
- Connect/refresh: native request on every attempt, chain switch if needed, authoritative identity reread, fresh on-chain reads. Source: user host findings.
- Preview: no external mutation; confirmed balances never change from a slider. Source: docs/PLAN.md.
- Approval: reset/exact allowance are separate explicit buttons; confirmed approval never starts supply. Source: AGENTS.md and M1 approvalSteps.
- Supply/withdraw: user reviews exact amount before one native request; submitted remains pending until canonical two-confirmation reconciliation. Source: M1 ActionContext/TxStore.
- Error: preserve editable amount, associate validation with field, focus invalid field, show rejection 4001 separately. Source: M3 request.
- Identity/stale: clear snapshot and previews; require fresh connect/read. Any async response from an earlier generation is ignored. Source: docs/PLAN.md.
- Reload: no stored identity assumed; connect again, then reconcile existing transaction journal before another action. Source: AGENTS.md.
- Sibling diagnostics: retains read-only M2 purpose, using the same wallet request boundary and CSS controls. Source: M2 existing tests.
## Display thresholds
Earnings below 0.01 USDT over the chosen period trigger a small-earnings warning. This is a display threshold, not a comparison with POL costs: no conversion quote exists, so net and fee break-even remain unavailable.
