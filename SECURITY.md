# Security

NestFlow is experimental, independent software. Mainnet sends are disabled in the normal build. No security audit or assurance is implied.

## Reporting a vulnerability

Use the repository hosting provider's private vulnerability-reporting channel (Security > Report a vulnerability) if enabled. If unavailable, open an issue requesting a private reporting channel without exploit details, wallet addresses, RPC credentials or other sensitive information. No monitored personal email or response-time promise is provided. Never share seed phrases or private keys.

Include the affected commit, environment, impact, reproduction using mocks or a local fork, and suggested remediation. Do not test using real funds or send mainnet transactions. Maintainers should reproduce privately, review a patch and regression test, and coordinate disclosure after remediation. If credentials leak, revoke/rotate them first; deleting a file does not erase Git history.

## Dependency review

On 2 November 2026, npm audit --omit=dev reported zero runtime findings. Full audit reports 15 dev-only findings (13 moderate, 2 critical), propagated through ESLint/TypeScript-ESLint minimatch and Vitest/mocker/Tinypool. npm audit fix --ignore-scripts found the compatible dependency resolutions already up to date; remaining proposed fixes are breaking and deferred. No --force or cross-major overrides were used. The mocker advisories concern exposed development mock registration; Tinypool concerns attacker-influenced worker options/prototype pollution. This project uses local vitest run with repository-owned tests/options and does not publish its test server. minimatch processes repository-owned lint paths. These limits reduce exposure; they do not remediate the vulnerable versions. Do not run untrusted tests or expose development servers. Plan a separately reviewed toolchain upgrade.

## Repository hygiene limitations

MIT LICENSE is present. .env and .env.* are ignored except the empty .env.example template. Existing ignored local .env is used only by the fork script, never bundled or committed. Pattern scans of tracked files and all reachable history found no credential/key patterns or tracked environment files. Scans are evidence, not proof against every possible secret format; ignored node_modules/build outputs and unreachable Git objects are outside this review.

Pre-rewrite review found a personal email in Git author/committer metadata. The user authorized rewriting main only after the completed History, price feeds and security review commit, using a nonpersonal GitHub noreply identity. The required backup/pre-rewrite branch intentionally preserves original metadata: do not publish that backup as email-free. Content and commit trees must stay identical during the rewrite; verification is repeated afterward. PNG metadata review found no text/EXIF chunks; email-like matches in compressed image bytes were false positives.
