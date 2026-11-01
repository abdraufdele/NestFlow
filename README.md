![NestFlow primary logo](docs/brand/nestflow-logo-b.png)

# NestFlow

Independent Nimiq Pay mini-app for Polygon USDT/USDT0 supply and withdrawal through Aave V3.

M1 and M2 are committed; M3 adds a mobile allocation preview, existing-position reads, explicit transaction states and withdrawal checks. **Mainnet sends are disabled.** Device approve/supply/withdraw remain unverified until funded and separately authorized. No backend or private keys.

## Local checks
Use Node 22.19+ and npm ci, then:
- npm run dev — injected-wallet reads; /diagnostics retains the M2 probe.
- npm run typecheck
- npm run lint
- npm test
- npm run build
- npm run test:e2e — bundled E2E-mode app with a mocked EIP-1193 provider; existing M1 Anvil guards remain enforced.
- npm run test:e2e:production — build and verify production send controls remain disabled.
- node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/test-fork.ts — existing local Anvil fork test; requires Foundry and POLYGON_RPC_URL. Never submits to mainnet.

Playwright requires its Chromium browser (npx playwright install chromium if missing). The test build is for local tests only; npm run build restores the production artifact.

See [product decisions](docs/PLAN.md), [backlog](docs/BACKLOG.md), [brand guide](docs/brand/BRAND.md), [M3 evidence](docs/m3-test-results.md) and [deferred device tests](docs/nimiq-pay-manual-tests.md).
