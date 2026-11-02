# NestFlow release checklist

M5b preparation only — 2 November 2026 (Africa/Lagos). This checklist does not authorize funds, mainnet transactions, a deployment or publication. **Funded device tests, redeploy and demo recording have not been performed by M5b.** Keep each item open until its own evidence is attached. Local M5b completion is not a release-readiness claim.

For each run record: date/time/timezone, tester, commit, URL/artifact hash, build mode/flag, OS/device/Nimiq Pay version, account (redact for sharing), chain, expected versus observed results and evidence location. Record public transaction hashes only with consent; never keys, seeds or RPC credentials. Any failed item blocks the relevant release claim until corrected and rerun.

## 1. Establish the candidate

- [ ] Confirm the intended main commit and clean worktree; read AGENTS.md, README, CHANGELOG, SECURITY and M3/M4/M5a/M5b evidence.
- [ ] Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, then `npm run test:e2e -- --reporter=line`. Run browser suites sequentially.
- [ ] Run `npm run test:e2e:production -- --reporter=line`, then `npm run build` normally. Production test must show disabled approve/supply/withdraw and zero send RPC calls. Confirm the final artifact is the normal build.
- [ ] Review runtime/development dependency audit findings and the tracked-file/history credential scan described in SECURITY.md. Record accepted remaining limits; do not equate an audit tool with security certification.
- [ ] Recheck all screens at 320px and desktop, keyboard focus/order, touch targets, reduced motion, contrast, long addresses, loading/empty/error/stale/pending/success/recovery states. Confirm supplied logo B remains unchanged.

## 2. Funded installed-device test — deferred, separate authorization

Obtain written authorization for the exact account, Polygon 137, verified underlying/Pool, maximum amount and POL fee budget. Funding alone is not authorization. Follow [the manual funded-build procedure](nimiq-pay-manual-tests.md#m4-private-funded-build-switch--remains-off). Keep that artifact and URL private. The existing cap is 5 USDT per action, including approval, supply and withdrawal; zero reset is separate. This is not a session cap or a POL-fee cap.

- [ ] Record the authorization reference and private artifact identity; verify that an amount above 5 USDT cannot be sent. Do not attempt an over-cap real send. Retain POL for authorized exit costs.
- [ ] Load via Nimiq Pay → Mini Apps → Custom URL. Connect, review native switch, reread Polygon/account and reconcile any old pending receipts before actions. Confirm token/Pool identities and observation times.
- [ ] **Approve:** authorize an exact amount at or below 5 USDT (zero reset separately if needed). Compare wallet/Pool/amount/network/fee. Wait for successful receipt and allowance reread. Confirm no supply occurred automatically.
- [ ] **Supply:** review fresh simulation, balance, reserve flags/cap and POL cost; authorize the separate supply. Verify canonical receipt plus changed wallet/supplied balances and confirmed event. A hash alone does not pass.
- [ ] **Rejection:** reject a native action (including supply after confirmed approval). Confirm friendly rejection, no automatic retry, unchanged supplied amount, approval remains separate and authoritative state is reread before any deliberate retry. Record whether any hash exists.
- [ ] **Withdraw:** check timestamped liquidity/reserve/debt/collateral diagnostics and gas. Perform only the authorized partial withdrawal, then an authorized remaining withdrawal within the cap, if applicable. Verify receipts and both balances. Accrued aToken balance may exceed the original amount; never bypass the cap to force a full exit.
- [ ] **Reload while pending:** for an expressly authorized pending approve/supply/withdraw, reload/reopen; connect again and reconcile. Unknown/pending must block duplicate sends. Verify final receipt before retry. If testing a wallet replacement/cancellation, authorize it separately and verify sender/nonce/call matching; cancellation is not original-action success.
- [ ] Exercise insufficient POL, user denial, unavailable reads, account/chain change and storage limitation without manufacturing unsupported state on mainnet. Use local mocks for reserve pause/liquidity/debt cases not observed on device; clearly label that evidence.
- [ ] Walk through `/independent-exit` and compatible access to the same Polygon V3 account/token in Aave. Record compatibility honestly; any actual withdrawal needs its own authorization. No seed export.
- [ ] Append funded results and screenshots to a dated verification record. Keep failed/unknown items open; mocks/fork results cannot replace device evidence.

## 3. Redeploy the public send-disabled build — deferred

- [ ] Remove/set false `VITE_ENABLE_FUNDED_TEST_SENDS` in shell, host build settings and applicable `.env*` files. Rebuild normally; removing the variable after building does not disable a private artifact. Never publish the private or E2E artifact.
- [ ] Rerun production guard against that candidate. Record build/commit/hash and authorized deployment destination. Preserve the prior normal release for rollback.
- [ ] With deployment authorization, upload the normal `dist/` to the intended static HTTPS host; configure SPA fallback for `/history`, `/independent-exit`, `/diagnostics`. Redeploy/purge stale cached HTML and chunks together as supported by the host.
- [ ] Reopen the exact deployed Custom URL in installed Nimiq Pay; test direct route loads and reload, connection, observations, history/retry, withdrawal checks and independent exit. Verify public actions remain disabled and no send RPC occurs. Check asset/console errors and the displayed build limitation. Record deployment ID/time/URL and screenshots.
- [ ] If deployed smoke checks fail, restore the prior normal send-disabled artifact and verify its routes. A rollback is not a reason to clear or resend a pending transaction.

## 4. Competition rules and scoring — recheck at submission

Sources opened during M5b on 2 November 2026: [competition rules](https://miniappscompetition.com/rules) and [scoring](https://miniappscompetition.com/scoring). This records source availability, not acceptance or an awarded score. Revisit the current pages and linked submission dashboard before release/submission; record URL, access date and applicable cycle/version.

- [ ] Review current eligibility, deadlines, category fit, submission channel and required fields directly on the current rules/dashboard. Confirm a public MIT repository, permitted original/attributed code, no credentials and the actual framework/token integration; do not infer qualification from branding.
- [ ] Check the requirement for a working usable app against actual funded-device evidence and the public send-disabled limitation. Resolve that readiness gap with the owner before representing the full flow as publicly usable. M5b grants no permission to enable public sends or submit.
- [ ] Map evidence to the current scoring categories: functionality/reliability/usefulness, Nimiq Pay integration, real usage, design/UX and builder promotion. Recheck weights rather than copying old research. Record genuine observed users and feedback only; synthetic E2E traffic is not usage evidence.
- [ ] Review description/demo claims against verified versus assumed status; attach required public links only after owner authorization. No submission, social posting or user outreach is performed by this checklist.

## 5. Record the demo — deferred

- [ ] Prepare a short script: independent identity and supported reserve; Custom URL/connect; confirmed balances; local split/fee/rate preview; separate approval/supply; timestamped withdrawal; rejection/pending reload; history/CSV; independent exit and limitations.
- [ ] Record phone screen plus narration with commit/URL/build mode visible. Use a clearly labeled mocked local demonstration for transaction steps unless the exact funded recording is separately authorized. Do not present mock balances or Anvil receipts as installed-device execution.
- [ ] State estimates and remaining device limits; show the normal public send-disabled build separately. Hide wallet-sensitive details/notifications and credentials. Review the final video for readability and truthful claims before any publication.
- [ ] Save the recording path/link, duration, script, date, build identity and reviewer result. Publication/submission remains a separate action.

## Release decision record

| Item | Result | Evidence / owner / date |
|---|---|---|
| Local candidate checks | Pending release rerun; [M5b local evidence](m5b-test-results.md) exists | — |
| Funded device flow | NOT RUN | — |
| Independent exit on installed device | UNVERIFIED | — |
| Public redeploy + smoke | NOT RUN | — |
| Rules/scoring submission review | Source pages opened; final review pending | — |
| Demo recording/review | NOT RECORDED | — |
| Release approval | NOT REQUESTED | — |
