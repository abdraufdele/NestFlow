# History, price feeds and security review implementation plan

Scope: explicit five-step user request, branch main, no real sends or mainnet transactions.
Use existing React/viem and styles; add no runtime dependencies.

1. Confirmed history: read Pool Supply/Withdraw logs for the account/reserve through head minus one (two mined confirmations). Read aToken balance at that block, independently of event totals. Bound reads to 2,000 blocks in 500-block chunks; clearly disclose incomplete lifetime coverage. Inspect external aToken transfers; never infer interest from balance minus partial principal. Failure must preserve withdrawals. Test filtering, confirmations, ordering, errors and transfer limits; commit.
2. CSV: export only validated confirmed events with account, chain, contract, block/hash/log index and amount. Include non-tax/accounting and coverage warnings, escape CSV fields. Test and commit.
3. Oracle: read latestRoundData for both resolved sources at the same block. Reject zero/future/older-than-one-hour updates and invalid rounds; unavailable optional quote keeps net/break-even unavailable and withdrawal usable. Unit/browser/fork verify; commit.
4. Hygiene: npm audit runtime/dev triage; only compatible updates, no force. SECURITY.md, full reachable-history/working-tree secret/email review without printing values, MIT check. Document limitations and commit.
5. Low-risk lazy imports for diagnostics/history with accessible loading/error fallback. Verify build/typecheck/lint/unit/browser/production/fork, update BACKLOG and verification record, commit.

Verified facts and assumptions are recorded in docs/m5a-test-results.md. No funded-device claim; prior Wallet interface tests/Transaction recovery and withdrawal checks limitations remain.
