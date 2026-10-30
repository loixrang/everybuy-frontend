# Current Task

## FE-061: Owner Passkey and Authenticator-App Two-Factor Security

Status: COMPLETED

## Goal

Give an owner a single, owner-protected security area to enrol and manage authenticator-app (TOTP) two-factor authentication and passkeys, while keeping password sign-in's existing second-factor challenge and adding passkey sign-in without a false TOTP step.

## Scope

- Verify the backend's passkey plugin, owner hook, TOTP endpoints, and Better Auth client behavior before implementing.
- Owner-only `/settings/security` page, reached from an owner card on `/settings`; staff are redirected rather than merely hidden from the link.
- TOTP status, QR and manual setup key, six-digit verification before enabling, one-time backup codes with copy/download and required acknowledgment, regeneration, and password-confirmed disable.
- Passkey list with name, creation date, device type, and backup status when supplied; owner-named registration, rename, and confirmed deletion with a last-method warning.
- Passkey sign-in on `/signin` that adopts the returned session and does not trigger the TOTP challenge.
- No tokens, challenges, setup keys, QR contents, backup codes, or credential payloads in storage or logs.

## Out of Scope

- Backend changes, schema changes, or new backend endpoints.
- Email OTP policy changes, SMS/push second factors, or staff-managed security methods.
- Reading existing backup codes or passkey counts beyond what the backend exposes.
- Live WebAuthn or TOTP verification without a running backend, database, owner account, and authenticator.

## Implemented

- `src/lib/auth-client.ts`: Better Auth browser client with `baseURL` from `VITE_API_BASE_URL`, `basePath: '/api/v1/auth'`, `credentials: 'include'`, and the passkey client plugin. No session token is stored by the frontend.
- `src/lib/api/passkeys.ts`: typed wrappers for `listUserPasskeys`, `addPasskey({ name })`, `updatePasskey({ id, name })`, `deletePasskey({ id })`, and `signIn.passkey()`, plus safe date/device/backup formatting and a secure-context support check.
- `src/lib/passkey-errors.ts`: normalises Better Auth `{ data, error }` and WebAuthn failures into user-facing messages, distinguishes cancellation, network, and server failures, and logs only operation, code, status, and source.
- `src/app/auth/RouteGuards.tsx`: `OwnerRoute` waits for the resolved role and redirects non-owners to `/settings` with an owner-only notice; `AuthProvider` exposes `roleResolved`.
- `src/pages/settings/SecuritySettingsPage.tsx` (`/settings/security`): composes TOTP and passkey settings and explains the one-time nature of backup codes.
- `src/pages/settings/SettingsPage.tsx`: owner-only security card; staff who arrive from the guarded route see "Security settings require owner access."
- `src/components/settings/TwoFactorSettings.tsx`: password-confirmed enrollment, `QRCodeSVG` rendering of the `otpauth://` URI, manual setup-key copy, six-digit verification, post-verification backup codes with copy/download and mandatory acknowledgment, password-confirmed regeneration, and disable confirmation. The enabled badge follows the confirmed mutation result even if the follow-up session read fails.
- `src/components/settings/PasskeySettings.tsx`: session-scoped passkey list, empty/unsupported/error states, owner-named registration, inline rename, delete confirmation, and a warning when deleting the only registered method.
- `src/components/ui/ConfirmDialog.tsx`: shared accessible confirmation dialog with focus handling, Escape/cancel, and busy state.
- `src/pages/auth/SignInPage.tsx` and `AuthProvider`: "Sign in with passkey" runs the WebAuthn ceremony, adopts `{ session, user }`, refreshes `/api/v1/me`, and does not enter the TOTP/OTP flow; the Better Auth client is dynamically imported for this action.
- `src/lib/totp.ts` and `src/lib/browser-files.ts`: `otpauth://` parsing/formatting, clipboard copying, and text download without persisting secrets.
- Tests: `src/lib/totp.test.ts` and `src/lib/passkey-errors.test.ts` cover URI parsing/formatting and passkey error mapping; the suite now has 81 tests.

## Checks

- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed
- `bun test`: 81 passed
- `bun run build`: passed
- `git diff --check`: passed

## Notes / Limitations

- Live passkey registration and sign-in, and live TOTP enrollment/disable/regeneration, were not exercised: they need a running backend/database, owner credentials, and a browser authenticator. The implementation follows the verified plugin endpoints and types; it must not be described as end-to-end verified.
- The backend exposes no HTTP endpoint or browser client method for existing backup codes, so the UI cannot show a count or re-display them. Codes are shown once after activation or regeneration.
- Backend dependency follow-up: the backend resolves `better-auth@1.7.10` while `@better-auth/passkey@1.7.14` declares a peer dependency on `better-auth ^1.7.14`. This is a backend dependency alignment issue, not a frontend contract change; see `Issues.md`.
- Backend owner enforcement remains authoritative: the hook rejects unauthenticated management with 401 and non-active-owner sessions with 403, and passkey sign-in rejects credentials that do not belong to an active owner.
- No backend, database, migration, or environment file was changed.

## FE-060: Staff Invitation Flow

Status: COMPLETED

## Goal

Make staff invitations usable end to end against the verified backend: an owner sends an invitation and can see its status, and the recipient opens a public link, reviews the invitation, chooses a password, and gets a working staff account.

## Scope

- Verify the owner invite, invitation list, revoke, preview, and accept endpoints in the backend source.
- Owner invitation form with name and email, validation, and clear success/failure feedback.
- Owner view of the pending invitation, its expiry and derived status, with revoke.
- Public `/invite/accept` route that works without a session and outside the dashboard layout.
- Token lookup, preview, and acceptance with loading, missing-token, unavailable, rate-limited, server, and network states.
- Password and confirmation with local validation and duplicate-submit protection.
- Success confirmation that does not sign the user in and links to sign in.

## Out of Scope

- Choosing a role at invitation time (the backend always creates `Staff`).
- Invitation history, resend, or bulk invitations (no endpoints).
- Refusing to demote or deactivate the last owner (backend gap, tracked in `Issues.md`).
- Backend changes of any kind.

## Implemented

- `src/lib/invitations.ts` holds the flow's pure rules: token trimming, the 12–128 character password check with confirmation, the duplicate-submit guard, safe error translation for preview and acceptance, the derived invitation status, and a diagnostic logger that excludes tokens and passwords.
- `src/pages/auth/AcceptInvitePage.tsx` is the public landing page:
  - Reads `token` from the query string; a missing token shows guidance and never calls the API.
  - Previews through `GET /api/v1/staff/invite/preview?token=…` and shows the invited name, email, fixed `Staff` role, and expiry.
  - Distinct loading skeleton, unavailable (400), rate-limited (429), server, and network states, with retry.
  - Password and confirmation fields with inline mismatch feedback and local length validation before submitting.
  - Submits `{ token, password }` to `POST /api/v1/staff/invite/accept` once at a time (ref guard plus disabled button).
  - On success shows "Your account is ready", clears both password fields, replaces the URL with `/invite/accept` so the token is no longer in the address bar or history, and links to `/signin`. It never signs the user in.
  - Raw backend messages are not shown; copy explains that an unavailable link may be expired, used, or replaced.
- `src/app/router.tsx`: `/invite/accept` is registered outside `ProtectedRoute` and `InventoryLayout`; the old `/accept-invite` path redirects to it with the query string preserved; both paths use the "Accept invitation" page title.
- `src/components/settings/StaffAccountModal.tsx`: the invitation form sends only `{ name, email }`, shows the fixed `Staff` role and the note that roles can be changed after acceptance, clears stale errors on input, and maps 409/500/503 to actionable messages instead of raw text.
- `src/components/settings/TeamSection.tsx`: the pending-invitation list shows only invitations still waiting to be accepted (`pending` or `processing`), with the status badge and expiry, and a revoke action. Accepted and expired rows are not shown, because the backend keeps accepted rows and neither state is pending. Role changes and deactivation use the verified `PATCH /api/v1/staff/:staffId`.
- `src/types/staff.ts` and `src/lib/api/staff.ts` were corrected to the verified shapes: staff rows include `email`, `active`, and `createdAt`, and acceptance returns `staff.staffId`.
- Tests: `src/lib/invitations.test.ts` (token handling, password rules, submit blocking, error mapping, status derivation), `src/lib/api/staff.test.ts` (paths, payloads, single-row normalisation, error propagation), and `src/pages/auth/AcceptInvitePage.test.tsx` (rendered missing-token, invalid, error, form, and success states).

## Checks

- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (0 warnings, 0 errors)
- `bun test`: 64 passed
- `bun run build`: passed
- `git diff --check`: passed
- Live backend: health returned 200 and an invalid token preview returned 400.

## Notes / Limitations

- The task text named `/api/v1/staff/invitations/preview` and `/api/v1/staff/invitations/accept`. Those routes do not exist; the backend mounts `/api/v1/staff/invite/preview` and `/api/v1/staff/invite/accept`, so the frontend follows the backend. See `DEC-027`.
- Invitations cannot carry a role: `POST /api/v1/staff/invite` accepts only `{ name, email }` and always creates `Staff`. The form says so instead of offering a control the backend ignores.
- Preview answers 400 for invalid, expired, accepted, and revoked tokens without a reason code, so the page shows one unavailable state. See `DEC-028`.
- `GET /api/v1/staff/invitations` returns the whole invitation table (404 when empty) and keeps accepted rows, so the owner section filters to `pending`/`processing` rather than showing already-accepted invitations as pending. See `DEC-029`.
- A full live run (owner creates an invitation, recipient opens the email link and accepts) needs owner credentials and a real pending token, neither of which is available here. The frontend logic, API paths, and rendered states are covered by tests and by backend source inspection.
- No backend, database, or environment file was changed.

## FE-059: Settings UX and Progressive Disclosure

Status: COMPLETED

Shop Details and profile display saved values by default, with owner-gated/explicit editing, cancel, and save states. Two-factor setup and maintenance forms and staff member controls appear only after selection. Reviewed major routes; dedicated creation/editing screens and forms remain direct because data entry is their primary purpose. No API, validation, permission, or backend behavior changed.

Checks passed: typecheck, lint, 37 tests, production build, and `git diff --check`. No browser/component automation is configured, so click-through behavior was checked by implementation review rather than an automated UI test.

## FE-058: Move Technical Backend Limitations Out of User-Facing Copy

Status: COMPLETED

Removed backend implementation details and non-actionable feature-limit explanations from user-facing screens, replacing necessary guidance with plain language. Added root `Issues.md` to collect verified backend and product follow-ups for engineering. No backend files were changed.

Checks passed: typecheck, lint, 37 tests, production build, and `git diff --check`.

## FE-057: Audit and Complete Two-Factor Authentication and OTP

Status: BLOCKED

Frontend work is implemented: authenticated TOTP enrollment (verification required before activation), disable and recovery-code regeneration; email OTP and backup-code login; challenge-state gating; and shared-client response/error handling. Contract recorded in `docs/API_CONTRACT.md` before implementation. The task remains blocked because Better Auth 1.7.10 can return `{ status: true }` when its email sender callback failed, so a frontend-only change cannot determine that email delivery failed. The user directed that the backend must remain untouched. The backend also stores OTP values in plaintext by default; no backend file was changed.

Frontend checks passed: typecheck, lint, 37 tests, production build, and `git diff --check`. The backend health endpoint and database port were unavailable, so authenticated sign-in, actual mail delivery, and database-backed TOTP/backup-code flows were not exercised end to end.

## Previous Task

## FE-056: Fix Email Verification Flow

Status: COMPLETED

After a password sign-in is rejected with Better Auth's `EMAIL_NOT_VERIFIED`, the page explicitly requests a verification email through the existing configured auth API client. It shows success only after `{ status: true }`, offers retry after failure, and applies a 30-second cooldown after confirmed sends. Existing sign-in and two-factor behavior is preserved.

Checks passed: typecheck, lint, 27 tests, production build, and `git diff --check`. The live mail provider flow could not be exercised because the hosted production backend and credentials are not available in this workspace.

## FE-055: Search Visibility, Performance, and CI/CD Preparation

Status: COMPLETED

Implemented private-app noindex metadata and route titles, split page code into lazy-loaded chunks, added Vite/Router base-path support, and created GitHub Actions CI with opt-in GitHub Pages deploy. Deployment remains disabled until production API and base-path variables plus backend origin settings are configured.

Checks passed locally: typecheck, lint, 24 tests, production build, and `git diff --check`. Route splitting reduced the initial JavaScript bundle to 281.32 kB (88.09 kB gzip), with no chunk-size advisory. A production build using `/everybuy-frontend/` as its base path also passed. GitHub-hosted workflow execution remains to be confirmed after these changes are pushed.

FE-041 remains BLOCKED: the inspected backend checkout has no stocktake routes. FE-043 remains DEFERRED.

---

## Completed Task Archive

## FE-041: Stocktaking

Status: BLOCKED

The user reports that stocktaking is implemented in the backend, but the inspected backend checkout (`master`, matching `origin/master`) has only stocktake tables and a status enum. It has no controller or API route for count creation, counted item capture, or approval. The backend README explicitly says there is no separate stocktake workflow. Existing owner-only stock adjustments cannot substitute for that contract.

## FE-054: Existing Financial and Shop Administration Integrations

Status: COMPLETED

Verified Expenses, Audit, Daily Overview, Profit Report, and Shop Settings against backend source and updated the API contract, architecture notes, report decision, and roadmap.

## FE-053: Mobile Navigation and Responsive Polish

Status: COMPLETED

## Goal

Make the shop usable one-handed on a phone: every section reachable, no horizontal scroll, no clipped tables, controls big enough to tap, and no content hidden under notches or the home indicator.

## Scope

- Give the mobile shell a complete navigation model (previously Overview and Movements were unreachable below `lg`).
- Respect device safe areas (notch, home indicator) without breaking the desktop layout.
- Keep desktop navigation visible while long pages scroll.
- Convert dense tables and dialogs to mobile-friendly equivalents.
- Fix the small-screen rendering problems found in an audit of every route.

## Out of Scope

- Offline/PWA behaviour, service workers, and install prompts.
- Native app shells or gestures beyond standard browser scrolling.
- New backend endpoints or data (nothing on these screens depends on them).

### Implemented

- `InventoryLayout` rebuilt around a five-tab mobile bar: **Stock** (`/inventory`), **Sale** (`/sales`), **Customers**, **Reports** (`/overview`), and **More**. Overview and Movements are no longer unreachable on phones.
- `MoreSheet` (below `lg`) lists Stock movements, Settings and Sign out:
  - Opens from the More tab; closes on backdrop, Escape, link tap, browser back/forward, and automatically at the `lg` breakpoint.
  - Modal dialog semantics (`role="dialog"`, `aria-modal`, labelled title), initial focus, a Tab focus cycle, focus returned to the More tab on close, and body scroll lock while open.
  - 44 px targets, safe-area bottom padding, and a `max-h-[85vh]` scrollable panel.
- Bottom navigation sits under a translucent blurred bar with `pb-[env(safe-area-inset-bottom)]`; a matching `h-[calc(4rem+env(safe-area-inset-bottom))]` spacer keeps the last row of content tappable.
- Header compacted to `h-16` on phones (`h-[77px]` from `lg`), brand text scales from `text-xl`, and the theme/sign-out buttons are 44 px on touch sizes. Safe-area top padding is applied to the sticky header.
- Desktop sidebar is now `sticky` below the header with its own height and scroll, so navigation stays visible on long inventory and report pages.
- The shell uses `min-h-dvh` (and the auth pages match), so iOS URL-bar chrome no longer adds phantom scroll.
- Navigation state is exposed with `aria-current="page"`, `aria-expanded` + `aria-haspopup="dialog"` on the More tab, and `aria-label`s on icon-only controls. Route changes scroll back to the top.
- Safe-area offsets on the sign-in and invite screens' floating theme toggle; `index.html` now uses `viewport-fit=cover` and a dark `theme-color` variant.
- `src/styles/index.css`: defined the `.no-scrollbar` utility the filter chip rows already referenced, pinned `text-size-adjust`, added `.pb-safe`, and set a 16 px minimum font size for text inputs below `sm` so iOS does not zoom on focus.
- Dialogs (`AddCustomerModal`, `RecordRepaymentModal`, `StockAdjustmentModal`, `StaffAccountModal`) render as bottom sheets below `sm` (rounded top corners, `max-h-[92vh]`, safe-area padding) and stay centred cards from `sm`.
- `ProductDetailPage`: recent movements now have mobile cards (the table only appears from `md`), the reference derivation moved into one `movementReference` helper, and the list is memoised.
- `StockMovementsPage`: table from `md` with `overflow-x-auto`; cards below `md`.
- `RecordSalePage`: product search results are capped and scroll inside the dropdown, stepper buttons and the Remove action grew to 44 px targets, and page headings were normalised to `text-2xl lg:text-[32px]`.
- `ReceiveStockPage` and `StockMovementsPage` headings and card padding normalised for small screens.

### Checks

- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)
- `bun test`: 24 passed
- `bun run build`: passed
- Production bundle inspected: safe-area `calc()` values are emitted with valid operator spacing, `.no-scrollbar`, `min-h-dvh` and the mobile input rule are present.

### Notes / Limitations

- No device or browser automation was available, so the responsive work was verified by code review, the compiled CSS, and the route audit rather than screenshots on real hardware. iOS safe-area values and the More sheet need a manual pass on an actual phone.
- Authenticated screens still cannot be exercised end to end: there are no account credentials and `allowSignUp` is `false` on the backend.
- Sales and inventory lists switch to cards below `lg`; the Stock movements table switches at `md`. Tables that remain on desktop are inside `overflow-x-auto` containers.
- Nothing in this task required an API change; all data on these screens already came from the verified endpoints.

---

## FE-052: Pack and Bag Unit Terminology

Status: COMPLETED

## Goal

Use the backend's actual selling units in the interface: **packs** and **bags**. Earlier copy (carried over from the design package) called the bulk unit a "carton", which matches neither the backend (`unit: 'Bag'`, `packsPerBag`, `bagPrice`) nor the shop's own language.

### Implemented

- Product setup: "Bags & selling prices", "Packs per bag *", "Bag price (₦) *", "Bag rules and permissions", and the page subtitle.
- Product detail: "Bag price", "Bag conversion", and the stock breakdown ("2 bags + 3 packs").
- Inventory list: subtitle and empty-state copy.
- Receive stock: "Sealed bags", "Each bag contains N packs", the option text ("N packs/bag"), the summary line ("2 bags × 6 packs"), and the validation message. Form state was renamed (`cartons` → `bags`, `cartonCount` → `bagCount`, `totalPacksFromBags`); the input id is now `receive-bags`.
- Record sale: "Sell packs or bags", the price hint ("₦X/pack · ₦Y/bag"), and the "Bag" add button.
- Sale detail: unit labels render `Bag` / `Pack` directly.
- Monthly report: "Bags and packs sold…", the "Bags" column, and the mobile card ("N bags").
- Documentation uses bags consistently (API_CONTRACT, ARCHITECTURE, ROADMAP, CHANGELOG, CURRENT_TASK).

### Checks

- `bun test`: 24 passed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed
- `bun run build`: passed

### Notes

- No API change: the backend enum is `Bag` / `Pack` (`src/common/types/enums/unit.ts`), and `packsPerBag` / `bagPrice` were already named for bags. This was a display-copy correction.
- There is no third unit. A bag's pack count is always the product's `packsPerBag`, applied server-side.

---

## FE-050: Settings and Team Access

Status: COMPLETED

## Goal

Replace the dead "Team & preferences" navigation item with a real settings page, and make staff onboarding usable end to end without inventing backend capabilities.

## Scope

- Show the signed-in account from the Better Auth session.
- Provide a working appearance setting (light/dark).
- List team members and add staff when the backend permits it.
- Support accepting an emailed staff invitation.
- Explain unavailable settings honestly instead of showing dead controls.

## Out of Scope

- Editing the profile name, email or password (no verified frontend contract).
- Changing a member's role or deactivating/removing a member (no endpoint).
- Store-level preferences such as shop name, currency or receipts (not stored).
- Pending-invitation management (no list/resend/revoke endpoint).

### Implemented:

- `/settings` route and navigation (desktop "Settings", mobile "More"); `/team` now redirects to `/settings`.
- `SettingsPage`:
  - Profile card read from the session: name, email, verification state, member since, two-factor state.
  - Appearance card with Light/Dark buttons that update `<html data-theme>` immediately.
  - Team card: `GET /api/v1/staff`, owner-only messaging on 403, empty state on 404, retry on other failures, desktop table and mobile list with Owner/Staff badges and a "You" marker.
  - Session card with server-side sign-out.
  - Honest notes for settings the backend cannot support yet.
- `StaffAccountModal` with two verified modes:
  - Email invitation (`POST /api/v1/staff/invite`).
  - Create account with an initial password (`POST /api/v1/staff`).
  - Client validation mirrors the backend (valid email, password 12–128, confirmation match) and maps 409/500/503 responses to actionable hints.
- `AcceptInvitePage` (`/accept-invite?token=…`, public):
  - Previews the invitation from `GET /api/v1/staff/invite/preview`.
  - Shows the invitee name, email and expiry, then creates the account via `POST /api/v1/staff/invite/accept`.
  - Handles missing/invalid/expired tokens, network failures, short passwords and mismatches.
- `src/lib/api/staff.ts` and `src/types/staff.ts` for the verified staff contract.
- `useTheme` is now a shared store (`useSyncExternalStore`) so the settings page and the header stay in sync.

### Checks:

- `bun test`: passed (24 tests)
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (0 warnings, 0 errors)
- `bun run build`: passed

### Notes / Limitations:

- The backend had no `/team` page at all before this change; the navigation item pointed at a 404.
- `GET /api/v1/staff` returns only `{ staffId, userId, name, role }`: no email, active flag, timestamps, or last sign-in. The page says so.
- There is no endpoint to change a role, deactivate, or remove a member, and no endpoint for pending invitations.
- There is no current-user role endpoint. The page infers owner access from the staff-list response (403 means staff) rather than guessing from the session.
- Email invitations require `STAFF_INVITE_PREVIEW_URL` on the backend. It is not set in the current `.env`, so `POST /api/v1/staff/invite` answers 500; the dialog explains this and offers the password mode, which works.
- Authenticated end-to-end testing was not possible without account credentials. Verified live: unauthenticated 401s, invitation preview/accept 400 handling, sign-in failure shape, CORS preflight, and the 3 requests/second throttle (400, 400, 429, 429, 429).
- No backend files were changed.

---

## FE-051: Branding, Dark Theme, Cursor Affordances and Tests

Status: COMPLETED

## Goal

Finish the Everybuy identity in the UI, make the dark theme genuinely dark, give clickable elements correct cursors, and add an automated test suite.

### Implemented:

- Replaced the design placeholder brand: `everyday`/"Everyday"/"Uyo" became **Everybuy** in the shell, sidebar footer, loading screen, sign-in screen and invite page.
- `index.html` title is `Everybuy`, with a description and theme-color; the default Vite favicon was replaced with an Everybuy bag mark; `package.json` name is `everybuy-frontend`; `README.md` was rewritten from the Vite template.
- Dark theme uses neutral near-black surfaces (`--color-canvas: #0A0B0A`, `--color-surface: #121412`, `--color-border: #262B26`) instead of green-tinted greys. The brand green remains the accent only.
- Global cursor rules in `src/styles/index.css`: pointer for links, enabled buttons, role=button/link/tab, summaries, labels, selects and checkboxes/radios/files; `not-allowed` for disabled controls and `aria-disabled`; `progress` for `aria-busy` regions.
- `useTheme` became a shared external store so the header toggle and the settings control cannot drift apart, and the stored theme is applied before first paint.
- Added `bun test` with 24 unit tests:
  - `money.test.ts`: kobo conversion, negatives, malformed input, round-trips.
  - `format.test.ts`: Naira formatting, stock thresholds, date helpers, Lagos month boundaries, month shifting/labels.
  - `client.test.ts`: JSON parsing, cookie credentials, JSON content type, `ApiError` messages, unauthorized event behaviour.
- Added `@types/bun` and `"types": ["bun"]` in `tsconfig.app.json` so tests type-check with the app.

### Checks:

- `bun test`: 24 passed, 0 failed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed
- `bun run build`: passed
- Live dev server: `/`, `/signin`, `/settings`, `/accept-invite?token=…`, `/inventory` all serve the SPA with the Everybuy title; backend CORS returns 204 with the correct origin and credentials.

### Notes / Limitations:

- Cursor and theme behaviour are CSS-only, so they were verified through the production bundle (new tokens and cursor rules present) rather than visually in a browser.
- No screenshot/visual regression testing is set up; component tests would need a DOM library, which was intentionally not added.

---

## FE-042: Monthly Reports and Overview

Status: COMPLETED

## Goal

Give staff an authoritative monthly view of shop performance — sales, money received, outstanding customer debt, product quantities sold, and closing stock — using the backend's monthly report instead of totals computed in the browser.

## Scope

- Verify the reporting endpoint, query validation, and response shape.
- Display monthly sales totals and money received.
- Show outstanding debt at month end.
- Display product sales and closing stock returned by the backend.
- Use the correct Africa/Lagos calendar month and allow browsing earlier months.
- Handle loading, empty month, permission, validation, and network states.
- Avoid deriving official totals from incomplete frontend data.

## Out of Scope

- The design's daily "Sales today / Payments received / Customer balances / Low stock" cards.
- The daily "Recent sales" table on the overview.
- Revenue, profit, and expense reporting (no stored cost/expense data).
- Any client-side aggregation across other endpoints.

### Implemented:

- `src/types/report.ts`: `MonthlyReport`, `MonthlyReportProductSales`, and `MonthlyReportClosingStock` matching the verified response.
- `src/lib/api/reports.ts`: `fetchMonthlyReport(month)` (`GET /api/v1/reports/monthly?month=YYYY-MM`).
- `OverviewPage` (`/overview`), replacing the placeholder:
  - Month selector defaulting to the current `Africa/Lagos` month, with previous/next month and a "This month" shortcut.
  - Month values validated against the backend pattern (`YYYY-MM`, month 01-12, `0000` rejected) before requesting.
  - Summary cards for sales this month, money received, outstanding debt at month end, and the number of product lines sold.
  - Product sales table (desktop) and cards (mobile) with bags, retail packs, and total packs.
  - Closing stock list with month-end pack balances and a link to inventory.
  - Loading skeleton, empty month, 401/403, error with retry, and network states; stale responses discarded when the month changes.
- `currentLagosMonth`, `shiftMonth`, and `formatMonthLabel` helpers in `src/lib/utils/format.ts`.
- Router now uses the real `OverviewPage`; the placeholder function was removed.

### Checks:

- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)
- `bun run build`: passed

### Notes / Limitations:

- No live end-to-end test was possible: the backend API (port 3000) and PostgreSQL (port 5432) were not running. Shapes, boundaries, and validation were verified from the backend controller, DTO, service, and `get-monthly-report.ts`.
- The endpoint is monthly only. The design's daily overview cards, low-stock alert, and recent-sales table are omitted rather than approximated from other endpoints. A daily overview needs a new backend endpoint.
- `moneyReceived` sums payments made during the month, including repayments of earlier sales; `outstandingDebtAtMonthEnd` is the cumulative unpaid balance on all customer sales up to month end. The screen states both rather than implying monthly-only figures.
- `closingStock` is a historical month-end balance, so it is shown as a plain pack count and not with the live low-stock badge (the 10-pack threshold is a current-inventory heuristic).
- Product names come from the joined product row, so a renamed product appears under its current name in historical reports; products have no delete endpoint.
- No cost, expense, or profit data exists in the backend, so only sales, receipts, debt, quantities, and stock are reported.
- No backend changes; work remains uncommitted.

---

## FE-021: Sales History and Details

Status: COMPLETED

## Goal

Show staff the recorded sales with their saved items and prices, and show each sale's customer, payments, and balance using the backend's authoritative statement data.

## Scope

- Verify the sales list and detail endpoints and their pagination.
- Display recorded sales with customer names and totals.
- Display each sale's saved item snapshots (name, unit, quantity, unit price, line total).
- Show amount paid, outstanding balance, payment status, and payment history where the backend supports it.
- Handle loading, empty, pagination, not-found, permission, and network states.
- Allow a repayment from the sale detail when the sale has a balance.

## Out of Scope

- The design's "Sales today", "Paid today", and "Balance owed" summary cards (no daily/aggregate endpoint).
- Server-side search and payment-state filters (the sales DTO accepts only `page` and `limit`).
- Per-sale statement fan-out to populate Owed/Status columns for the whole list.
- Payment method and recorded-by names (not stored / not resolvable).

### Implemented:

- `src/types/sale.ts`: `SaleDetail` and `SalesPage` types matching the verified response shapes.
- `src/lib/api/sales.ts`: `fetchSales(page, limit)` (`GET /api/v1/sales`) and `fetchSale(id)` (`GET /api/v1/sales/:id`).
- `SalesPage` (`/sales`):
  - Replaces the previous placeholder.
  - Server-paginated list (20 per page, total count) ordered `soldAt` desc by the backend.
  - Desktop table and mobile cards showing sale reference, customer name, date, and total.
  - Customer names are mapped from one `GET /api/v1/customers` request; a customer-list failure degrades to `Customer #<short id>` without hiding sales.
  - Previous/Next pagination with a showing range, loading skeleton, empty state, retry, and staff-access error.
  - Record-sale CTA.
- `SaleDetailPage` (`/sales/:id`):
  - Loads the sale with its item snapshots from `GET /api/v1/sales/:id`.
  - For a sale with a customer, loads that customer's statement once and extracts the matching sale for paid amount, balance, status, and payment history.
  - Header with sale reference, full date/time, customer, and Paid / Partly paid / Unpaid badge.
  - Items table/cards with product name, quantity and unit (Bag or Pack), packs per bag, unit price, and line total.
  - Sale summary (items, total, amount paid, balance owed, payment type, customer) and customer card linking to `/customers/:id`.
  - Payment history (date and amount) and a repayment action when a balance remains, reusing `RecordRepaymentModal`.
  - Success banner after a repayment, with the sale and statement reloaded from the backend.
  - Loading, 404, 403/401, statement-failure warning, and network error states.
- `formatLongDate` helper in `src/lib/utils/format.ts`.
- Router registers `/sales` and `/sales/:id`; the Sales navigation item is active on both.

### Checks:

- `bun run build`: passed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)

### Notes / Limitations:

- No live end-to-end test was possible: the backend API (port 3000) and PostgreSQL (port 5432) were not running. Shapes and error behaviour were verified from the backend controller, service, and DTOs.
- `GET /api/v1/sales` accepts only `page` and `limit`; there is no search, customer filter, or payment-state filter. The design's search and "All payment states" controls are omitted rather than filtering only the current page.
- The sales list response has no items, payments, or balance. The list therefore shows sale reference, customer, date, and total; Owed/Status and the daily summary cards are omitted. Fetching a statement per row would exceed the 3 requests/second throttle.
- `GET /api/v1/sales/:id` returns the sale and items only. Paid amount, balance, status, and payment history come from one `GET /api/v1/customers/:id/statement` request when the sale has a customer.
- A sale with no customer is necessarily paid at the point of sale: the backend rejects `amountPaid < itemsTotal` without a customer. The detail page shows the total as paid, a zero balance, and "Paid at sale"; it does not invent a payment method.
- Payment method is not stored and `recordedBy` is a user id with no verified name lookup, so the design's Method and Recorded by columns are omitted.
- Sale references use the first 8 characters of the UUID because the backend has no `SL-####` numbers.
- Repayments recorded from the sale detail refresh both the sale and its customer statement instead of patching balances locally.

---

## FE-022: Customer Debts and Repayments

Status: COMPLETED

## Goal

Let staff find customers, view each customer's sales and payment history, and record repayments against the correct outstanding sale using the backend's computed balances.

## Scope

- Verify the customer, statement, repayment, and update endpoints.
- Build the customer directory with the fields the API actually returns.
- Build the customer statement screen from `GET /api/v1/customers/:id/statement`.
- Record repayments against an outstanding sale with idempotent retries.
- Show updated balances and payment history after a successful repayment.
- Support editing a customer's name, phone, and active status.

## Out of Scope

- Deriving balances from partial frontend data or fanning out one statement request per customer.
- Payment method, payment date, and reference fields that the `payments` table does not store.
- Deleting customers (the backend has no delete endpoint).
- Address, town/LGA, state, and notes fields (the `customers` table does not store them).

### Implemented:

- `src/types/customer.ts`: `Customer`, `CreateCustomerInput`, `UpdateCustomerInput`, `PaymentStatus`, `StatementSale`, `CustomerStatementTotals`, `CustomerStatement`, `RecordRepaymentInput`, and `RecordRepaymentResult`, verified against `customers.service.ts` and the schema.
- `src/lib/api/customers.ts`:
  - `fetchCustomers` (`GET /api/v1/customers`).
  - `fetchCustomer` (`GET /api/v1/customers/:id`; the backend returns an array, so the client takes the first record).
  - `createCustomer` (`POST /api/v1/customers`).
  - `updateCustomer` (`PATCH /api/v1/customers/update/:id`).
  - `fetchCustomerStatement` (`GET /api/v1/customers/:id/statement`).
  - `recordRepayment` (`POST /api/v1/customers/:id/repayments`).
- `CustomersPage` (`/customers`):
  - Customer directory with name/phone search, All/Active/Inactive filters, desktop table, and mobile cards.
  - Add-customer dialog (name required, phone optional) with backend error mapping.
  - Loading skeleton, empty, no-results, retry, and staff-access error states.
- `CustomerDetailPage` (`/customers/:id`):
  - Loads the single statement request and displays the backend's totals: balance owed, total sales, money received, and last purchase.
  - Outstanding-sales table with total, paid, owed, and a per-sale repayment action.
  - Payment history (newest first) using backend `paidAt` and `amount`.
  - Customer details card (phone, added date, active status) and edit action.
  - Repayment success banner after the statement is refreshed.
- `RecordRepaymentModal`:
  - Sale selector limited to outstanding sales, amount input matching the backend regex, full-balance shortcut, and an exact kobo-based preview.
  - Idempotent `requestId` retained across retries and reset when the sale or amount changes.
  - Overpayment guard plus mapping for 400/403/404/409/429 and network failures.
- `CustomerEditPage` (`/customers/:id/edit`): name, phone, and active toggle; cancel/save with 400/403/404/409/429 error mapping.
- `src/components/customers/CustomerStatusBadge.tsx`, `AddCustomerModal.tsx`, `RecordRepaymentModal.tsx`.
- `formatShortDate` and `trimMoney` helpers in `src/lib/utils/format.ts`; `PencilIcon`, `ChevronRightIcon`, and `WalletIcon` in `src/components/ui/Icons.tsx`.
- Router routes for `/customers`, `/customers/:id`, and `/customers/:id/edit`; sidebar/mobile navigation now marks Sales and Customers active.

### Checks:

- `bun run build`: passed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)

### Notes / Limitations:

- No live end-to-end test was possible: the backend API (port 3000) and PostgreSQL (port 5432) were not running. Request/response shapes and error behaviour were verified from the backend controllers, services, DTOs, and schema.
- `GET /api/v1/customers` returns no balance or last-sale data. Fetching a statement per customer would exceed the backend's 3 requests/second throttle, so the directory omits the design's "Balance owed" and "Last sale" columns and links each row to the statement instead. The statement remains the authoritative source for balances.
- The `payments` table stores only `amount`, `requestId`, `paidAt`, and `recordedBy`. The repayment design's "Payment method", "Payment date", and "Reference" inputs are not implemented; the UI shows the backend-recorded time and amount.
- Neither `sales` nor `payments` records a payment type, so the design's "At sale"/"Repayment" distinction is omitted.
- Sale and payment rows use UUIDs; the backend has no human-readable `SL-####` number. The UI shows `#` plus the first 8 characters and keeps the full id in the `title` attribute.
- The `customers` table stores only `name`, `phone`, `active`, and timestamps. The customer-edit design's Town/LGA, State, Address, and Notes fields are not implemented.
- All displayed balances, payment statuses, and totals come from the backend statement response. The only client-side amount is the clearly labelled post-repayment preview, calculated with integer kobo arithmetic.
- Recording a repayment does not alter stock; the page refreshes the statement after the backend confirms the payment.
- FE-040's supported customer-management scope (create, list, read, update, deactivate) is delivered by these shared customer screens.

---

## FE-002: Authentication and Session Management

Status: COMPLETED

## Goal

Sign staff in against the existing Better Auth backend, keep the session in the backend's cookie, protect the inventory application, and support sign-out and two-factor challenges without introducing frontend token storage.

## Scope

- Verify the sign-in, session, sign-out, and two-factor endpoints against the installed Better Auth version.
- Implement the sign-in screen using the supplied `signin.svg` design.
- Load the session on startup and protect authenticated routes.
- Handle two-factor authentication (authenticator app or emailed code) when the account enables it.
- Handle invalid credentials, unverified email, untrusted origin, rate limiting, expired sessions, and network failures.
- Implement sign-out.

## Out of Scope

- Sign-up, password reset, or staff invitation acceptance (backend has sign-up disabled for this auth instance).
- Role-specific navigation (the session does not expose the Owner/Staff role).
- Revoking other sessions or managing two-factor settings.

### Implemented:

- `src/types/auth.ts`: verified Better Auth types (`AuthUser`, `AuthSession`, `SignInResponse`, `TwoFactorChallenge`, `TwoFactorMethod`, `TwoFactorVerifyResponse`) and a `isTwoFactorChallenge` guard.
- `src/lib/api/auth.ts`: `fetchSession` (`GET /api/v1/auth/get-session`), `signInWithEmail` (`POST /api/v1/auth/sign-in/email`), `signOut` (`POST /api/v1/auth/sign-out`), `sendTwoFactorOtp`, `verifyTwoFactorOtp`, and `verifyTwoFactorTotp`.
- `src/app/auth/AuthProvider.tsx` + `auth-context.ts`:
  - Loads the current session on startup (loading / authenticated / unauthenticated states).
  - Keeps no tokens in JavaScript; only the backend cookie is used.
  - Clears local state when any application request returns 401 (session expired or revoked).
  - Only updates state after the backend confirms sign-in, verification, or sign-out.
- `src/app/auth/RouteGuards.tsx`: `ProtectedRoute` (redirects to `/signin` and remembers the attempted path), `GuestRoute` (sends signed-in users to `/inventory`), and a branded session-loading screen.
- `src/pages/auth/SignInPage.tsx` (`/signin`):
  - Matches `signin.svg` (centered 440 px card on desktop, 350 px on mobile; brand wordmark; "Welcome back"; email/password; footer notes), with light/dark support and visible focus styles.
  - Password show/hide control, disabled/pending submit state, and accessible labels.
  - Two-factor step with 6-digit code input; supports authenticator-app codes (`verify-totp`) and emailed codes (`verify-otp`), with resend and method switching when the backend reports both.
  - Error mapping for `INVALID_EMAIL_OR_PASSWORD`/401, `EMAIL_NOT_VERIFIED`, `INVALID_ORIGIN`, `INVALID_CODE`, `OTP_HAS_EXPIRED`, `TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE`, `ACCOUNT_TEMPORARILY_LOCKED`, rate limiting, server errors, and network failures.
  - Returns the user to the page they originally requested after sign-in (state-provided path only).
- `src/lib/api/client.ts`: emits `UNAUTHORIZED_EVENT` when a non-auth request is rejected with 401, so the session state and route guard update immediately.
- `src/lib/hooks/useTheme.ts`: shared light/dark theme hook used by the shell and the sign-in screen.
- `src/components/layout/InventoryLayout.tsx`: shows the signed-in user's name/email, adds a sign-out control with an inline error if revoking the session fails, and uses the shared theme hook.
- `src/app/router.tsx`: `/signin` for guests; all inventory routes behind `ProtectedRoute`.
- `src/main.tsx`: wraps the app in `AuthProvider`.
- `src/components/ui/Icons.tsx`: added `LogOutIcon`.

### Checks:

- `bun run build`: passed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)

### Notes / Limitations:

- No live end-to-end sign-in was possible in this environment: the backend API (port 3000) and PostgreSQL (port 5432) were not running. Endpoint shapes, cookies, and error codes were verified from the installed backend source and `better-auth` 1.7.x distribution.
- The backend must have `FRONTEND_URL` set to the exact frontend origin; otherwise Better Auth rejects sign-in with `INVALID_ORIGIN`. The UI maps that to an actionable message.
- Sign-up is disabled for the main auth instance, so the UI has no sign-up link. Accounts are provisioned by the owner/invitation flow.
- Email verification is required by the backend (`requireEmailVerification: true`); unverified accounts get a clear message instead of a session.
- The Better Auth session does not expose the Owner/Staff role. The UI therefore cannot derive role-specific navigation from the session; backend guards (`OwnerGuard`/`StaffGuard`) remain authoritative and 403 responses are surfaced by pages.
- A signed-in user without an active `staff` row passes the frontend route guard but receives 403 from staff endpoints. There is no verified endpoint that reports staff access to the frontend.
- Two-factor backup codes are not handled in this UI; authenticator-app and emailed codes are.
- The backend's global Nest throttler allows 3 requests/second per route and 100/minute; repeated sign-in attempts can therefore be rate limited (mapped to a user-facing message).

---

## FE-020: Record a Sale

Status: COMPLETED

## Goal

Implement the sale recording flow according to the verified backend contract: multi-item cart with pack/bag units, customer selection, amount paid with balance rules, idempotent submission, and conflict handling.

## Scope

- Inspect sale creation rules (`POST /api/v1/sales`, guarded by `StaffGuard`).
- Support the actual product units (`Pack` / `Bag`) and quantities.
- Validate stock availability client-side and handle backend 409 conflicts.
- Handle failed and conflicting submissions.
- Prevent accidental duplicate submissions (client-generated UUID `requestId`).

## Out of Scope

- Sales history and details (FE-021)
- Payments and repayments (FE-022)
- Full customers management page (FE-040; only inline customer creation needed for credit sales)

### Implemented:

- `src/types/sale.ts`: verified sale domain types (`Sale`, `SaleItem`, `Payment`, `CreateSaleInput`, `CreateSaleResult` with `replayed` flag).
- `src/types/customer.ts`: `Customer` and `CreateCustomerInput`.
- `src/lib/utils/money.ts`: `toKobo`/`fromKobo` integer-kobo helpers ported from the backend so client totals never drift through floating point.
- `src/lib/api/sales.ts`: `createSale` (`POST /api/v1/sales`).
- `src/lib/api/customers.ts`: `fetchCustomers` (`GET /api/v1/customers`), `createCustomer` (`POST /api/v1/customers`), both StaffGuard.
- `src/pages/sales/RecordSalePage.tsx` (`/sales/new`):
  - Client-side product search with Pack/Bag add buttons; adding the same product+unit increases quantity (backend rejects duplicate product+unit lines).
  - Cart lines with quantity steppers, per-line totals priced from DB snapshots (`retailPrice`/`bagPrice`), and per-product "Available: N packs" warnings with client-side stock validation across combined lines.
  - Customer select with inline "Add a customer" form (name + optional phone) for credit sales.
  - Amount paid input with backend regex validation (`^\d{1,12}(\.\d{1,2})?$`), over-payment guard, and customer-required-when-balance-remains rule (mirrors backend 400s).
  - Sale summary card (items, total, amount paid, balance owed, cash/credit line) with "Save sale".
  - Idempotent `requestId`: kept across retries of an identical payload, regenerated when the sale is edited (backend 409s a reused id with different content), cleared only on success.
  - 409 → "Save blocked" panel with "Refresh stock" (matches `sale_conflict.svg`); 404/403/400/network errors mapped to user-facing messages.
  - Success state with total/paid/balance/customer, `replayed` notice, "Record another sale" (resets form and refreshes stock).
- Registered `/sales/new` and a minimal `/sales` placeholder (nav already linked to it) in `AppRouter`.

### Checks:

- `bun run build`: passed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)

### Notes / Limitations:

- The design's "Payment method" field is not implemented: the backend `payments` table has no payment-method column. Do not fake it.
- "Sale type" (cash/credit) is derived from the balance, not stored; the backend has no sale-type column.
- Sale prices are always computed by the backend from the product row; the frontend displays the same computation for preview only.
- `POST /api/v1/sales` returns `updatedProduct` as `[{ id }]` (ids only, no balances).
- Products and customers are fetched with `limit: 100` / full list (no search parameter on either endpoint).

---

## Completed: FE-012 Inventory and Stock Movements

Status: COMPLETED

## Goal

Display product stock movement history, available balances, and implement stock adjustments and addition tracking according to verified backend capabilities.

## Scope

- Inspect stock movement endpoints (`GET /api/v1/stock/movements`, `GET /api/v1/stock/movements/:id`).
- Inspect stock adjustment endpoint (`POST /api/v1/stock/adjustments`, guarded by `OwnerGuard`).
- Inspect stock addition endpoint (`POST /api/v1/stock/additions`, guarded by `StaffGuard`).
- Display stock movements list view and per-product movement history.
- Handle loading, empty, and error states.

## Out of Scope

- Recording sales (FE-020)
- Purchases management (FE-030)
- Stocktaking review and approval (FE-041)

### Implemented:

- `src/types/stock.ts`: verified stock domain types (`StockMovement`, `StockMovementsPage`, `UpdatedProductStock`, `Supplier`, mutation input types with `requestId` and `unit`).
- `src/lib/api/stock.ts`:
  - `fetchStockMovements(page, limit)` for the paginated `{ data, page, limit, total }` response.
  - `fetchAllStockMovements(maxPages)` accumulating pages client-side (backend has no `productId` filter on movements).
  - `createStockAddition` and `createStockAdjustment` sending client-generated UUID `requestId` and `unit: 'Pack'` per the verified schema.
  - `fetchSuppliers` (full error propagation).
- `src/pages/stock/ReceiveStockPage.tsx` (`/inventory/receive`):
  - Bags + loose packs entry combined into a single pack-denominated receipt.
  - Idempotent submission: `requestId` kept in a ref across retries, cleared only on success.
  - Supplier selection (optional), non-blocking supplier-load warning via `Promise.allSettled`.
  - 403/404/409 error mapping; quantity cap 1,000,000.
- `src/pages/stock/StockMovementsPage.tsx` (`/movements`):
  - Paginated ledger load (all pages accumulated, capped) with client-side product/type/free-text filters.
  - Desktop table and mobile record cards; loading, empty, filtered-empty, and error states with retry.
  - Adjust-stock action with product selector (defaults to URL `productId` filter).
- `src/components/stock/StockAdjustmentModal.tsx`:
  - Add/Sub direction toggle, quantity (1..1,000,000) and required reason (1..500) per backend rules.
  - Idempotent `requestId` ref pattern; projected-balance preview; 403/404/409 error mapping (`OwnerGuard` messaging for 403).
- `src/pages/inventory/ProductDetailPage.tsx`: per-product movement history (last 5) via `fetchAllStockMovements`, adjustment success merges partial `{ id, stockPacks }` updates and refreshes history.
- Registered `/inventory/receive` and `/movements` routes in `AppRouter`.

### Checks:

- `bun run build`: passed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)

### Notes / Limitations:

- `GET /api/v1/stock/movements` has no `productId` filter; per-product history is filtered client-side over accumulated pages (capped at 10 pages x 100).
- Backend addition/adjustment responses return only `{ id, stockPacks }` for products (`UpdatedProductStock`), not full product objects; pages merge the balance into local state.
- Receipt reference/notes inputs were removed from the receive form because `createStockSchema` has no note/reference fields.

---

## Completed: FE-011 Product Details and Setup

Status: COMPLETED

### Implemented:
- `fetchProductById`, `createProduct`, and `updateProduct` API methods in `src/lib/api/products.ts`.
- Input validation types (`CreateProductInput`, `UpdateProductInput`) in `src/types/product.ts`.
- `ProductDetailPage` (`/inventory/:id`):
  - Summary metrics: available stock (with bags/packs breakdown), pack price, bag price.
  - Product setup card: brand, category, base unit, bag conversion, pieces per pack, active status.
  - Action buttons: "Edit product", "Receive stock", "View movements".
  - Loading, 404 not found, and error states with retry.
- `ProductSetupPage` (`/inventory/new` and `/inventory/:id/edit`):
  - Form fields matching backend schema: name, brand, category, pack type, size, pieces per pack, packs per bag, retail pack price, bag price, active status.
  - Form validation: positive integers for quantities, positive prices, required brand/category.
  - Authorization feedback: clear messaging when mutations are rejected by `OwnerGuard` (403 Forbidden).
  - Clean cancel and save actions with submit loading indicators.
- Registered `/inventory/new`, `/inventory/:id`, and `/inventory/:id/edit` routes in `AppRouter`.

### Checks:
- `bun run build`: passed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)
