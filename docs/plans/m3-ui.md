# M3 UI flow implementation plan

Scope authorized by the 1 November 2026 request: M3 only, main branch, split bar option A. No mainnet sends. Existing M1 math, checks, transaction journal and execution are reused. Device host findings are user-reported evidence, not new testing.

1. Add adapter and flow tests first; establish failing M3 assertions.
2. Centralize injected wallet requests, identity validation and receipt reconciliation in wallet.ts. Real sends disabled; Playwright uses a test-only injected EIP-1193 transport.
3. Implement mobile-first confirmed balances, local split preview, cost/earnings estimates, separate approval and supply states, withdrawal eligibility.
4. Test error states, races, refresh/reopen and duplicate actions. Update manual-test deferrals and signature decision.
5. Run typecheck, lint, units, build, Playwright and existing fork test when its prerequisites are available; review changes, commit M3: UI flow.

Visual direction: a quiet financial worksheet with a dark ink header, warm paper background, teal allocation rail and gold wallet marker. Original raster logo, system rounded sans, tabular amounts. Shared CSS tokens and native accessible controls. One page with Supply / Withdraw sections; diagnostics remains a separate read-only sibling.


## Execution record
- Adapter launch, switch reread, missing/changed identity and production-send blocking tests: RED then GREEN.
- UI screen, browser happy path and failure coverage implemented against mocked EIP-1193; M1 execution and journal reused.
- Final review found two Important issues: unbounded reads and supply estimates not refreshed after approval. Each reproduced with a failing regression test, then fixed. Native dialogs retain no artificial timeout.
- Read-only RPCs have a 15-second bound; timed-out native permissions/sends are never presumed cancelled. Active workflows reread identity rather than invalidating themselves when a native dialog backgrounds the page.
- Browser fixture now refuses supply gas estimation without sufficient allowance. Each confirmed zero-reset/exact approval refreshes costs.
- Static strict UI audit: zero findings. Desktop/mobile screenshots inspected.
- M4/M5 work and funded-device sends remain deferred. No new worktree, branch change, deployment or mainnet send.
Final zero-reset regression: the allowance-sensitive mock reproduced a disabled reset button when the adapter estimated approve(new amount) before reset. Estimate approve(0) for the next step instead; show remaining costs and refresh later-step estimates only after confirmation.
