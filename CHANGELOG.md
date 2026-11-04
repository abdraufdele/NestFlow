# Changelog

## POL quote fix — 2 November 2026

Restore same-block Aave oracle POL/USDT conversion when USDT source timestamps are unavailable, visibly label the unverified age, and retain mandatory WPOL freshness. Net/break-even estimates use the available quote and complete fees. See [verification](docs/pol-quote-test-results.md).

## Unreleased — Design and accessibility review, 2 November 2026

- Screen polish: one tagline, filled Connect, shared spacing/motion/state styles, phone layout and navigation targets. Supplied logo B retained unchanged.
- README expanded with setup, Nimiq Pay Custom URL, usage, evidence/limits and controlled-build guard instructions.
- Wording review and release checklist tracked in Design and accessibility review verification; no funding or real sends.

## History, price feeds and security review — 2 November 2026

Confirmed bounded on-chain history, CSV provenance, feed freshness, hygiene review and lazy screens. See [History, price feeds and security review verification](docs/m5a-test-results.md).

## Transaction recovery and withdrawal checks — 2 November 2026

Receipt/replacement recovery, withdrawal diagnostics, manual shortfall, local planning preferences and independent exit. Private funded-build cap added but left disabled. See [Transaction recovery and withdrawal checks verification](docs/m4-test-results.md).

## Wallet interface tests — 1 November 2026

Mobile planning/supply/withdrawal screens, split preview and explicit transaction states. See [Wallet interface tests verification](docs/m3-test-results.md).

## Core logic and Nimiq Pay integration tests — 31 October–1 November 2026

Core bigint/configuration/action library and read-only Nimiq Pay host probe. See [Core logic and fork tests verification](docs/M1-VERIFICATION.md) and [Nimiq Pay integration tests record](docs/m2-test-results.md). These milestone dates describe implementation evidence, not funded-device approval.
