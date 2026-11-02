# NestFlow design context
## Product and audience
An independent Nimiq Pay mini-app for discretionary Polygon USDT. The page helps users compare keeping funds in the wallet with supplying to Aave V3. The current user request authorizes M4 recovery, diagnostics and decision features. Deferred visual polish stays in docs/BACKLOG.md. See AGENTS.md, docs/PLAN.md and docs/plans/m3-ui.md.
## North Star
A clear allocation worksheet: the live gold/teal split is the main interaction; confirmed balances are always separate. Quiet supporting surfaces and explicit costs keep the decision legible on a phone.
## Visual register and anti-references
Product UI, English. No marketing landing page, decorative charts, gradients, yield-growth animation or template dashboard tiles. No Japanese-market scope.
## Identity and tokens
Source: docs/brand/BRAND.md. Preserve the original PNG logo bytes. src/styles.css owns all runtime tokens: --brand-teal #027F7B, --brand-gold #EEB346, --brand-ink #08282B. Gold is a fill/accent with dark ink text, never small white text. UI additions: --paper #F5F8F6, --surface #FFFFFF, --muted #496369, --line #CAD9D6, --warning-bg #FFF2D5, --warning-ink #64440C, --danger #9A3028, --focus #114FBD. Native controls inherit the same tokens. No generated token adapter.
## Typography and layout
Trebuchet MS for rounded headings/body with Segoe UI fallback; Segoe UI for small utility labels; no font download or fabricated logo wordmark. Tabular numerals for financial amounts. Natural document scroll; one column on mobile, planning and withdrawal columns above 760px. Inputs and buttons are at least 44px. The original logo links home.
## Interaction and motion
Native labeled text/range controls, numeric keyboard, visible focus, error association and text equivalents. Split motion is a 150ms local preview only; reduced motion removes transitions/animation. No interaction sends automatically. Status and recovery remain inline.
## Verification
Project checks and screenshots are recorded in docs/m3-test-results.md. Playwright covers narrow layout, keyboard, reduced motion, offline/error/stale and pending states. A full screen-reader and installed-device M3 audit remains unverified.

## M4 extensions
Reuse existing panels, form controls, status and tokens for manual shortfall and recovery. Independent exit is available without a connection at /independent-exit. Timestamped checks describe only the observed amount; no blanket safety badge. Preferences contain only device-local planning inputs. Diagnostics link is dev-only. M4 screenshots and verification are in docs/m4-test-results.md.

## M5a extensions
The explicit M5a request adds /history using existing panel, caption, warning and native button styles. Confirmed on-chain event rows are separate from the current confirmed aToken balance, recovery journal and forecast preview. Missing/incomplete history withholds earnings and shows coverage. Diagnostics/history use lazy chunks with shared loading and reload fallback. No new visual system or branding changes. Evidence: docs/m5a-test-results.md.
