# History, price feeds and security review verification — 2 November 2026 (Africa/Lagos)

Historical record: the later [POL quote fix](pol-quote-test-results.md) supersedes the mandatory-USDT-timestamp policy and quote-unavailable behavior below. The original fork observations/results remain unchanged.

Scope: five explicitly authorized History, price feeds and security review steps in C:\Users\PC\Projects\NestFlow, main. core logic through transaction recovery retained. No mainnet sends, send-flag enablement, funding, deployment, new dependency or protocol. Existing installed-device transaction limitations remain.

## Behavior and evidence

| Feature | Verified evidence | Limits/failure handling |
|---|---|---|
| History | history.test.ts; e2e/m5a.spec.ts; extended Anvil harness | Pool Supply onBehalfOf and Withdraw user, exact underlying; head minus one, at least two confirmations; block-hash canonicality/reorg checks; independent aToken balance at the confirmed block; sorted block/log order. No journal or forecast becomes a historical event. |
| Coverage/earnings | unit transfer/error/noncanonical tests; browser empty/RPC failure | Last 2,000 blocks, 500-block pages; external aToken transfers detected separately; earlier transfers unknown. Lifetime coverage is always incomplete, so reconstructed earnings are always unavailable. No fabricated interest figure. |
| CSV | historyCsv.test.ts; browser download and exact event rows | Only confirmed event rows; exact amount/base units and account/chain/contracts/block/hash/log/time. Header contains not-tax/accounting-advice and provenance/incompleteness warnings; cells quoted and formula prefixes neutralized. Empty window exports headers, not a lifetime-zero claim. |
| Oracle | quote.test.ts (stale/zero/future/unreadable source despite fresh block reproduced failing first); mocked stale-feed browser test | Both source latestRoundData updates must be positive, no later than observation, at most 3,600 seconds old, positive answer and valid round. Recent read block alone is insufficient. Source read failure removes optional quote/net/break-even, preserving withdrawals. |
| Hygiene | docs/npm-audit-m5a.json; scripts/review-hygiene.mjs; SECURITY.md | Runtime zero findings; full audit 15 dev-only findings (13 moderate/2 critical). Compatible audit fix found dependencies already current; no force, overrides or breaking upgrade. MIT LICENSE verified. No tracked .env or credential patterns in text blobs across reachable commits. Existing ignored .env is local fork configuration, never printed/bundled. |
| Lazy screens | browser loaded diagnostics and aborted history chunk | Diagnostics and History lazy imports; shared Suspense status/reload boundary; failed history chunk does not block withdrawal checks. Main JS about 591 kB, diagnostics 20.27 kB, history UI about 3.72 kB plus reader about 3.05 kB. Vite warning remains; broader bundler changes deferred. |
| UI | docs/m5a-history.png, 320px browser overflow check, docs/m5a-ui-audit.json | Existing panels/tokens/native buttons and unmodified logo. Strict audit zero findings. No full screen-reader or installed-device certification. |

## Commands

- npm run typecheck — PASS.
- npm run lint — PASS.
- npm test — PASS, 83 tests / 14 files.
- npm run test:e2e -- --reporter=line — PASS, 59 mocked-provider browser tests.
- npm run test:e2e:production -- --reporter=line — PASS, 1 production-artifact send-guard test; normal build, no send RPC calls.
- npm run build — PASS (also run by production check); normal production dist retained.
- node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/test-fork.ts — PASS at fork block 96585274. Foundry 1/1; real viem approve/supply/partial/full withdrawal and journal reconciliation on local Anvil. Confirmed history one supply/two withdrawals and independent zero final balance through block 96585282. Upstream Polygon receives reads only.
- Strict frontend audit — PASS, zero findings.
- git diff --check — PASS.

The actual USDT source 0x01Aba1Fe7D72a3490bEef7CD0C09e1Ba2dD88D83 rejects latestRoundData at the fork observation. The current POL quote is therefore unavailable; no freshness is invented for that adapter. Source timestamp interface: https://docs.chain.link/data-feeds/api-reference#latestrounddata. The one-hour threshold is a conservative product limit, not a verified feed heartbeat.

An initial fork attempt correctly rejected the unsupported source interface. The harness now treats the optional quote as unavailable and continues testing local actions. A later upstream log query hit the free RPC's ten-block range restriction. The successful harness restricts its history query to the known locally created fixture blocks; it does not prove full upstream historical log availability. The production history screen discloses RPC failures rather than inventing events. Nonfatal Foundry cache/explorer notices remain.

The first full lint found a history render ref access; the final implementation uses state for the rendered adapter and passes lint. CSV empty-window assertion was corrected to distinguish chain metadata from event rows. Earlier Wallet interface tests/Transaction recovery and withdrawal checks screenshot files generated by regression tests are restored to their bytes from before the history, price feeds and security review; only the new History, price feeds and security review screenshot is retained.

## Privacy and post-commit identity procedure

Text scans found no personal email in tracked source/history blobs. PNG chunks had no text/EXIF metadata; regex email-like matches in compressed image bytes were false positives. This is pattern/format review, not proof of absence of every secret format or image pixel content. Ignored dependencies/build outputs and unreachable Git objects are excluded.

A personal Gmail address was present in existing author/committer metadata. User explicitly authorized: finish and commit History, price feeds and security review first, create backup/pre-rewrite, rewrite every main commit to the requested nonpersonal NestFlow Dev identity, set repo-local identity, verify unchanged content/worktree and repeat build/typecheck/lint/tests. That post-commit procedure preserves every commit tree and message, changes author/committer metadata and parent hashes, and is reported in the chat. The backup intentionally retains original metadata and must not be described as email-clean or published as such. No global config change or force push is authorized/performed.

## Assumptions remaining

Mocks are synthetic; fork transactions are local, not Nimiq Pay funded-device proof. Lifetime history, external transfers before the window, future rates/gas/liquidity and device transaction compatibility remain unknown. The existing free RPC may refuse a history page. All reconstructed earnings remain unavailable. Full audit dev findings and Vite warning remain documented rather than hidden.
