# Core logic and fork tests implementation and verification

Scope: the six items in the user's Core logic and fork tests request. Preserve README and brand files.
The explicit request authorizes pure spending-preference and shortfall helpers;
it does not authorize T1 UI, Nimiq Pay integration tests host integration, or mainnet transactions.

Implementation sequence:
1. Add Vite/React/TypeScript, specified libraries, ESLint, Vitest and MIT license.
2. Write arithmetic tests, observe failures, implement bigint fixed-point helpers.
3. Verify configuration against official sources and on-chain identity/relationships.
4. Test and implement action-specific reads, eligibility, simulation, gas and writes.
5. Test and implement durable IndexedDB state transitions, recovery and duplicate guard.
6. Add local Polygon fork tests; run typecheck, lint, unit tests, build, config and fork checks.

Safety decisions: reads use an observation block; failed reads propagate; frozen
reserves can be withdrawn; collateral-backed debt needs exact withdrawal simulation;
uncertain broadcasts block retries. Never interpret missing receipts as failure.
Production wallet construction uses only injected EIP-1193 providers. No UI actions
or live wallet transactions are part of Core logic and fork tests. Fee conversion requires a sourced quote.

Prerequisites found: Node 22.19.0, npm 10.9.3. Foundry tools not found and
POLYGON_RPC_URL unset at initial inspection. These are required checks, not skips.

Verification results and reproduction instructions: see [core logic and fork test results](M1-VERIFICATION.md).
