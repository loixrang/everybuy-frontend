# 2026-11-02: FE-064 Theme Preferences and Startup Initialization

Added:
- Device, Light, and Dark preference support with synchronous document-head resolution before React and the Better Auth session check.
- Settings selector for the three preferences and tests for preference parsing and resolution.

Changed:
- Runtime theme state now preserves the selected preference, responds to OS theme changes in Device mode, and syncs across tabs.
- The HTML startup surface has theme-appropriate foreground and background colors before application CSS loads.

Verification: typecheck, lint, 112 tests, and production build passed. Browser startup verification is unavailable in this environment.

# 2026-10-30: FE-062 Category and Brand Management

Added:
- Owner-only `/settings/catalog` management page with Categories and Brands tabs, showing active and inactive records and supporting create, soft-deactivation, and reactivation.
- Confirmed deactivation, validation, duplicate and authorization feedback, and loading, empty, success, and error states.
- API wrappers use the verified category and brand list, create, and update routes.

Changed:
- Product setup now excludes inactive categories and brands from both creation and editing selectors.
- Owner Settings includes the catalog management link; the route guard also blocks staff direct navigation.

Blocked:
- Typecheck, lint, all 109 tests, production build, and `git diff --check` passed.

Authorization recheck:
- Confirmed `CategoriesController` now applies `OwnerGuard` to category POST and PATCH in addition to the controller-level `StaffGuard`. Updated the API contract and marked FE-062 complete. No backend files were modified in this frontend workspace.

# Changelog

### 2026-11-02: FE-063 POS Search and Cart Refactor

Added:
- Inline product search rows with wrapped names, stock-aware add actions, and an accessible plus button.
- Cart line cards with pack/bag selection, stock-limited quantity controls, removal, line totals, and a sale total.
- Pure pack conversion, max quantity, stock validation, and line-total helpers.

Changed:
- Product selection now adds one pack, clears the search, and adjusts an existing product line rather than creating duplicates.
- Customer and payment inputs remain attached to the cart's recalculated total.

Verification: typecheck, lint, production build, and `git diff --check` passed.

### 2026-10-30: FE-061 Owner Passkey and Authenticator-App Security

Added:
- Owner-only `/settings/security` page behind `OwnerRoute`, linked from a security card on `/settings`. Staff are redirected with an owner-only notice, while the backend hook remains the enforcement point.
- Passkey management through the Better Auth browser client: list, owner-named registration, rename, and confirmed deletion with a warning when removing the only registered method. Device type and backup status render only when supplied.
- "Sign in with passkey" on `/signin`, which adopts the returned `{ session, user }`, refreshes the owner role, and does not enter the TOTP/OTP challenge.
- `ConfirmDialog` as the shared accessible confirmation surface for destructive security actions.
- Tests for `otpauth://` parsing/formatting and normalized passkey error messages.

Changed:
- TOTP settings now show a QR code plus copyable setup key, reveal backup codes only after a valid authenticator code activates TOTP, require acknowledgment before leaving the codes, and use confirmation dialogs for regeneration and disable.
- The TOTP enabled badge follows the confirmed mutation result even when the follow-up session read fails.
- `AuthProvider` exposes `roleResolved` so `OwnerRoute` never redirects before `/api/v1/me` resolves.
- The Better Auth client is dynamically imported for passkey sign-in, keeping it out of the initial bundle.

Security:
- Tokens, challenges, TOTP setup keys, QR contents, backup codes, and passkey credential payloads are never written to browser storage or logs; diagnostic logs contain only operation, error code, HTTP status, and failure source.

Checks: typecheck, lint, 81 tests, production build, and `git diff --check` passed. Live WebAuthn registration/sign-in and TOTP enrolment need a running backend, owner credentials, and an authenticator, so they were not exercised end to end. The backend `better-auth@1.7.10` / `@better-auth/passkey@1.7.14` peer-version mismatch is recorded in `Issues.md`.

### 2026-10-30: Settings Responsive Polish

Changed:
- The settings card grid uses top alignment, so short cards (two-factor, appearance) no longer stretch to the height of the taller profile card on desktop, and spacing tightens from 6 to 4 on phones.
- The two-factor header stacks the title above the status badge on phones and sits them side by side from `sm`.
- Two-factor trigger buttons, password forms and destructive actions use 44 px targets on phones, stack the field above a full-width button, and return to compact inline sizing from `sm`.
- The pending-invitation row stacks the details above a full-width Revoke button on phones, then returns to a single row with a compact button on larger screens.
- Mobile team controls (Manage, role select, deactivate/reactivate) and the invitation Refresh/Add staff buttons meet the 44 px touch height, with compact heights retained on desktop.

Checks: typecheck, lint, 64 tests, production build, and `git diff --check` passed. Verified through code review and the compiled classes; no device automation is configured.

### 2026-10-30: Pending invitations stay pending; compact security card

Changed:
- The settings "Pending invitations" list now shows only invitations still waiting to be accepted (`pending` or `processing`). Accepted and expired rows no longer appear under a "pending" heading, and the empty state reads "No pending invitations."
- The two-factor authentication card no longer stretches to match the taller profile card: the settings grid aligns its children to the top, so each card is only as tall as its content.
- The two-factor card header shows the enabled state as a badge next to the title and explains authenticator and email codes in one line instead of two paragraphs.

Added:
- `isPendingInvitation` in `src/lib/invitations.ts`, with tests covering pending, processing, accepted, and expired invitations.

Fixed:
- Corrected the documented invitation-list contract: `GET /api/v1/staff/invitations` returns every invitation row, including accepted ones; it does not return a single row.

Checks: typecheck, lint, 64 tests, production build, and `git diff --check` passed.

### 2026-10-30: FE-060 Staff Invitation Flow

Added:
- Public `/invite/accept` page outside the auth guards and dashboard shell: token preview (`GET /api/v1/staff/invite/preview`), password creation with confirmation, and acceptance through `POST /api/v1/staff/invite/accept`.
- Distinct loading, missing-token, unavailable, rate-limited, server, and network states, a single-submit guard, and a success screen that links to sign in without signing the user in.
- `src/lib/invitations.ts` for token handling, password validation, error translation, duplicate-submit blocking, invitation status derivation, and diagnostics that exclude tokens and passwords.
- Pending-invitation status badges with expiry and revoke in the settings team section, limited to invitations still awaiting acceptance.
- Tests for invitation logic, the staff API client, and the rendered public page states.

Changed:
- The invitation form sends only `{ name, email }` and states that the role is always Staff, because the backend's invite DTO accepts no role; roles are changed after acceptance via `PATCH /api/v1/staff/:staffId`.
- `/accept-invite` now redirects to `/invite/accept` with the query string preserved.
- Staff types and API client corrected to the verified shapes (`email`, `active`, `createdAt`, and `staff.staffId` on acceptance).
- After a confirmed acceptance the token is removed from the URL, and raw backend error text is never displayed.

Checks: typecheck, lint, 63 tests, production build, and `git diff --check` passed. A live owner-to-recipient invitation run was not possible without owner credentials and a real pending token.

### 2026-10-30: FE-059 Settings UX and Progressive Disclosure

Changed:
- Shop details and profile name now display as read-only values until Edit is selected; both support cancel and save states.
- Two-factor setup/maintenance forms and per-member team controls appear only after the matching action is selected.
- Removed an empty preferences panel and kept create/edit forms on their existing dedicated routes or dialogs.

Checks:
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: 37 passed
- `npm run build`: passed
- `git diff --check`: passed

### 2026-10-30: FE-058 Move technical backend limitations out of the interface

Added:
- Root `Issues.md` to collect verified backend gaps and follow-ups for engineering.

Changed:
- Replaced user-facing implementation explanations with plain guidance or removed non-actionable limitation notices.
- Kept implementation-specific details in engineering documentation rather than exposing them to shop staff.

Checks:
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: 37 passed
- `npm run build`: passed
- `git diff --check`: passed

Record meaningful frontend changes here.

## Unreleased

### 2026-10-30: FE-057 Two-Factor Authentication and OTP

Added:
- `TwoFactorSettings` for authenticated TOTP enrollment, setup URI display, required verification before activation, password-confirmed disable, and recovery-code replacement/display.
- Backup-code login alongside TOTP and email OTP. Auth state stays unauthenticated until Better Auth returns the verified user/session.
- Better Auth 1.7.10 API contract and security findings in `docs/API_CONTRACT.md`, including rate limits, expiry, attempt limits, production email configuration, plaintext OTP-at-rest default, and provider error response behavior.

Changed:
- The shared auth API client now validates 2FA response shapes and confirmed status values; all requests continue to use the configured API base and cookie credentials.
- Email OTP copy says the request was accepted and does not claim delivery, because the backend can hide provider callback failures. No backend files were changed, per the user's direction.

Checks: typecheck, lint, 37 tests, production build, and `git diff --check` passed. The API health endpoint and database were unavailable, so live authenticated flows and actual email delivery were not exercised.

### 2026-10-30: FE-056 Email Verification Flow

Fixed:
- An `EMAIL_NOT_VERIFIED` sign-in response now triggers Better Auth's `POST /api/v1/auth/send-verification-email` through the shared API client. The page shows an email-sent notice only after the endpoint confirms `{ status: true }`.
- Added a resend/retry action with loading and failure states and a 30-second cooldown after confirmed sends. A failed request is not described as sent.

Changed:
- Documented that the backend requires email verification but does not enable `sendOnSignIn`; automatic email sending therefore does not occur on the sign-in rejection.
- Added API tests for the endpoint path, payload, cookie credentials, unconfirmed response, and server failure.

Checks: typecheck, lint, 27 tests, production build, and `git diff --check` passed. Live email delivery was not exercised because the hosted backend and production credentials are not available in this workspace.

### 2026-10-29: SEO Hygiene, Route Splitting, and CI/CD

Changed:
- Added descriptive static metadata, noindex directives, an application robots file, and route-specific browser titles. The authenticated application is intentionally excluded from search indexes; no sitemap is published.
- Lazy-loaded feature pages and the inventory layout behind a shared accessible loading fallback to reduce the initial JavaScript download.
- Added `VITE_BASE_PATH` support for both Vite assets and React Router routes; the favicon follows the deployment base path.
- Added a GitHub Actions pipeline for typecheck, lint, tests, and production build. It uploads a default-branch artifact and optionally deploys that verified artifact to GitHub Pages when API/base-path variables are configured.
- Added deployment setup documentation covering Pages configuration and backend CORS/cookie requirements.

Checks: typecheck, lint, 24 tests, production build, and `git diff --check` passed. Route splitting reduced the initial JavaScript bundle to 281.32 kB (88.09 kB gzip); no chunk-size advisory was emitted. The GitHub-hosted workflow has not yet run; Pages deployment remains skipped until repository variables and Pages publishing are configured.

### 2026-10-29: Poppins and Small-Screen Touch Polish

Changed:
- Switched the primary bundled typeface to Poppins; Inter remains the fallback. Included the Poppins SIL Open Font License.
- On small screens, enabled buttons now have a 44 px minimum height, long table/code values can wrap, and page-level horizontal overflow is clipped while intentional inner scrollers remain available.
- Verified that the inspected backend checkout still has no stocktake endpoints despite its stocktake schema; FE-041 remains blocked until an API contract is available.

Checks: typecheck, lint, 24 tests, production build, and `git diff --check` passed. The build emitted the existing >500 kB chunk advisory.

Responsive limitation: validated in code and compiled CSS; no device/emulator screenshot pass is available in this environment.

### 2026-10-29: Roadmap and Active Task Reconciliation

Changed:
- Verified and documented the existing Expenses, Audit, Daily Overview, Profit Report, and Shop Settings integrations against the backend source. FE-054 is complete.
- Updated the report roadmap and DEC-018 to reflect the daily and profit endpoints now used by `/overview`.
- Kept FE-043 (Online Store) deferred and recorded FE-041 (Stocktaking) as blocked by missing backend endpoints in the inspected checkout.

Checks:
- `bunx.cmd tsc -b --noEmit`: passed
- `bun.cmd run lint`: passed
- `bun.cmd test`: 24 passed
- `bun.cmd run build`: passed (Vite emitted the existing >500 kB chunk advisory)
- `git diff --check`: passed

### 2026-10-29: FE-053 Mobile Navigation and Responsive Polish

Changed:
- Mobile navigation now has five tabs (Stock, Sale, Customers, Reports, More). Overview and Movements were previously unreachable below `lg`.
- New "More" bottom sheet for Stock movements, Settings and Sign out: modal dialog, Escape/backdrop/link dismissal, focus cycle and focus return, body scroll lock, and automatic close at `lg`.
- Safe-area support: `viewport-fit=cover`, safe-area padding on the header, tab bar, sheets and modals, safe-area-aware spacers, and a `100dvh` shell height instead of `100vh`.
- Touch targets are at least 44 px on phones: header buttons, theme/sign-out controls, quantity steppers, and the sale Remove action.
- Desktop sidebar is sticky below the header and scrolls independently, so navigation stays visible on long pages.
- Recent movements on the product page and the movements ledger render as cards on phones; the movements table only appears from `md` and scrolls horizontally.
- Record-sale product search results are capped in height and scroll inside the dropdown instead of covering the form.
- Dialogs (customer, repayment, stock adjustment, staff account) open as bottom sheets below `sm`.
- Page headings and card padding normalised across record sale, receive stock and stock movements.
- Sign-in and invite screens respect safe areas and use `100dvh`.

Fixed:
- `.no-scrollbar` was referenced by the filter chip rows but never defined.
- iOS now gets a 16 px minimum font size for text inputs below `sm`, which stops the page zooming on focus.
- Route changes scroll back to the top of the page; the hash-less SPA previously kept the previous scroll offset.

Checks: `bunx tsc -b --noEmit`, `bun run lint`, `bun test` (24 passed), `bun run build`.

Notes:
- Responsive behaviour was verified through code review and the compiled CSS; there is no device/emulator automation, so iOS safe areas need a manual phone pass.
- No API, backend or data changes.

### 2026-10-29: FE-052 Pack and Bag Units

Changed:
- The interface now says **bag/bags** instead of "carton/cartons" for the bulk unit, matching the backend enum (`Bag` | `Pack`) and the `packsPerBag` / `bagPrice` field names.
- Updated copy across product setup, product detail, inventory, receive stock, record sale, sale detail, and the monthly report ("Bags" column and mobile summary).
- Receive-stock form state and ids were renamed (`cartons` â†’ `bags`, `receive-cartons` â†’ `receive-bags`).
- Documentation updated to use bags consistently.

Notes:
- No API or schema change; this is display copy only. The product's `packsPerBag` still defines how many packs a bag holds.

### 2026-10-29: FE-050 Settings, Team Access and Invitations

Added:
- `SettingsPage` (`/settings`): profile summary from the session, appearance control, owner-only team list, session sign-out, and notices. `/team` now redirects to `/settings`, and the navigation item is "Settings" (desktop) / "More" (mobile).
- `StaffAccountModal` with two verified onboarding paths: email invitation (`POST /api/v1/staff/invite`) and account creation with an initial password (`POST /api/v1/staff`), including backend-aligned validation and 409/500/503 hints.
- `AcceptInvitePage` (`/accept-invite?token=â€¦`, public): previews an invitation, shows invitee/expiry, creates the account via `POST /api/v1/staff/invite/accept`, and handles invalid/expired tokens and network errors.
- `src/lib/api/staff.ts` and `src/types/staff.ts` for the verified staff contract.
- Shared theme store: `useTheme` now uses `useSyncExternalStore` so the settings control and the header toggle stay in sync and the stored theme applies before first paint.

Changed:
- The team section never assumes a role from the session: it requests `GET /api/v1/staff` and shows "Owner access required" on 403, an empty state on 404, and a retry on other failures.

Notes:
- Backend limitation: `GET /api/v1/staff` returns no email, active flag, or timestamps; there is no endpoint to change roles, deactivate members, manage pending invitations, or edit the profile.
- `STAFF_INVITE_PREVIEW_URL` is unset in the backend `.env`, so invitations return 500 until it points at `/accept-invite`; the dialog explains this and offers password mode.
- Authenticated E2E testing was not possible without credentials; unauthenticated 401s, invitation 400 handling, sign-in failures, CORS, and the 3 req/s throttle were verified live.
- No backend files were changed.

### 2026-10-29: FE-051 Everybuy Branding, Dark Theme, Cursors and Tests

Added:
- `bun test` suite (24 tests) covering money helpers, formatting helpers (including Lagos month boundaries), and the API client's parsing/error/unauthorized behaviour.
- `@types/bun` and `"types": ["bun"]` so tests type-check with the app.
- Global cursor rules: pointer for clickable elements, `not-allowed` for disabled controls, `progress` for `aria-busy` regions.

Changed:
- Replaced the design placeholder branding with **Everybuy** across the shell, sidebar, loading screen, sign-in screen and invite page; removed the fictional "Uyo" store line.
- Dark theme is now neutral near-black (`#0A0B0A` canvas, `#121412` surface, `#262B26` border) instead of green-tinted dark greys; the brand green remains the accent.
- `index.html` title/description/theme-color, a new Everybuy favicon, `package.json` name, and a rewritten project README replacing the Vite template.

Checks:
- `bun test`: 24 passed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed
- `bun run build`: passed

### 2026-10-29: FE-042 Monthly Reports and Overview

Added:
- `MonthlyReport`, `MonthlyReportProductSales`, and `MonthlyReportClosingStock` types in `src/types/report.ts`.
- `fetchMonthlyReport(month)` in `src/lib/api/reports.ts` for `GET /api/v1/reports/monthly?month=YYYY-MM`.
- `OverviewPage` (`/overview`), replacing the placeholder:
  - Month selector defaulting to the current `Africa/Lagos` month, previous/next navigation, and a "This month" shortcut.
  - Month values validated against the backend pattern before requesting.
  - Summary cards for sales this month, money received, outstanding debt at month end, and product lines sold.
  - Product sales table/cards with bags, retail packs, and total packs.
  - Closing stock list with month-end pack balances and an inventory link.
  - Loading skeleton, empty month, 401/403, error/retry, and network states.
- `currentLagosMonth`, `shiftMonth`, and `formatMonthLabel` helpers in `src/lib/utils/format.ts`.

Changed:
- `/overview` is now the real monthly report instead of an informational placeholder.

Checks:
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)
- `bun run build`: passed

Notes:
- No live end-to-end test was possible: the backend API (port 3000) and PostgreSQL (port 5432) were not running. Shapes and validation were verified from backend source.
- Backend limitation: the only reporting endpoint is month-based. The design's daily "Sales today / Payments received / Customer balances / Low stock" cards and "Recent sales" table have no endpoint and are omitted rather than derived client-side.
- `moneyReceived` includes payments for earlier sales; `outstandingDebtAtMonthEnd` is cumulative debt at month end. The page explains both.
- Closing stock is a historical month-end balance and is shown without the live low-stock badge.
- No cost, expense, or profit data exists, so the report covers sales, receipts, debt, product quantities, and stock only.

### 2026-10-29: FE-021 Sales History and Details

Added:
- `SaleDetail` and `SalesPage` types in `src/types/sale.ts`, matching `GET /api/v1/sales/:id` and the paginated list envelope.
- `fetchSales(page, limit)` and `fetchSale(id)` in `src/lib/api/sales.ts`.
- `SalesPage` (`/sales`), replacing the placeholder:
  - Server-paginated list (20 per page) with sale reference, customer, date, and total.
  - Customer names mapped from one customer-list request; falls back to a short customer id if that request fails.
  - Desktop table, mobile cards, Previous/Next pagination, showing range, loading skeleton, empty state, retry, and staff-access error.
  - Record-sale CTA.
- `SaleDetailPage` (`/sales/:id`):
  - Saved item snapshots with product name, quantity/unit (Bag or Pack), packs per bag, unit price, and line total.
  - Sale summary with items, total, paid, balance, payment type, and customer.
  - One customer statement request for customer sales, providing payment status, balance, and payment history.
  - Repayment action when a balance remains, reusing `RecordRepaymentModal`; success reloads the sale and statement.
  - Full date/time header, customer link, load/404/401/403/statement-failure/network states.
- `formatLongDate` helper in `src/lib/utils/format.ts`.
- Routes for `/sales/:id`; the Sales navigation item is active on `/sales` and `/sales/new`.

Changed:
- `/sales` is now a real history screen instead of an informational placeholder.

Checks:
- `bun run build`: passed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)

Notes:
- No live end-to-end test was possible: the backend API (port 3000) and PostgreSQL (port 5432) were not running. Shapes and error behaviour were verified from backend source.
- Backend limitation: the sales list DTO accepts only `page` and `limit`; there is no search, customer filter, or payment-state filter. Those design controls are omitted rather than filtering only the loaded page.
- Backend limitation: list rows contain no items, payments, or balance, so the Owed/Status columns and the daily Sales today/Paid today/Balance owed cards are omitted. Per-row statement fan-out would exceed the 3 requests/second throttle.
- `GET /api/v1/sales/:id` does not include payments; customer sales use one statement request for paid/balance/payment history. Sales without a customer are necessarily paid in full at sale (backend rule), shown as "Paid at sale" without asserting a payment method.
- Payment method is not stored and recorded-by names cannot be resolved, so those design columns are omitted.
- Sale references use the first 8 UUID characters because the backend has no `SL-####` numbers.

### 2026-10-29: FE-022 Customer Debt, Statements, and Repayments (also completes FE-040)

Added:
- Customer statement types in `src/types/customer.ts`: `UpdateCustomerInput`, `PaymentStatus`, `StatementSale`, `CustomerStatementTotals`, `CustomerStatement`, `RecordRepaymentInput`, and `RecordRepaymentResult`, verified against `customers.service.ts`, the DTOs, and the schema.
- Customer API functions in `src/lib/api/customers.ts`: `fetchCustomer`, `updateCustomer`, `fetchCustomerStatement`, and `recordRepayment` alongside the existing list/create helpers.
- `CustomersPage` (`/customers`): directory with name/phone search, All/Active/Inactive filters, desktop table and mobile cards, add-customer dialog, and loading/empty/no-results/retry/staff-access states.
- `CustomerDetailPage` (`/customers/:id`):
  - Backend-computed balance owed, total sales, money received, and last purchase from a single statement request.
  - Outstanding-sales table with total/paid/owed and a per-sale repayment action.
  - Payment history using the backend's `paidAt` and `amount`, plus a refreshed success banner after a repayment.
  - Customer details card and edit action.
- `RecordRepaymentModal`: outstanding-sale selector, backend-matching amount validation, full-balance shortcut, integer-kobo balance preview, idempotent `requestId`, and 400/403/404/409/429 error mapping.
- `CustomerEditPage` (`/customers/:id/edit`): name, phone, and active-status toggle with cancel/save and error handling.
- `CustomerStatusBadge`, `AddCustomerModal`, and `RecordRepaymentModal` under `src/components/customers/`.
- `formatShortDate` and `trimMoney` helpers; `PencilIcon`, `ChevronRightIcon`, and `WalletIcon`.
- Routes for `/customers`, `/customers/:id`, and `/customers/:id/edit`.

Changed:
- Desktop sidebar and mobile navigation now mark Sales and Customers as active on their routes.

Checks:
- `bun run build`: passed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)

Notes:
- No live end-to-end test was possible: the backend API (port 3000) and PostgreSQL (port 5432) were not running. Shapes and error behaviour were verified from backend source.
- Backend limitation: `GET /api/v1/customers` returns no balance or last-sale data, so those directory columns are omitted; balances are shown on the customer statement. Per-customer statement fan-out was deliberately avoided because of the 3 requests/second throttle.
- Backend limitation: the `payments` table has no method, entered-date, or reference columns, so the repayment design's "Payment method", "Payment date", and "Reference" fields are not implemented, and the "At sale"/"Repayment" distinction is omitted.
- Backend limitation: `customers` stores only name, phone, active, and timestamps; address, town/LGA, state, and notes fields are not implemented.
- Sale references show `#` plus the first 8 UUID characters because the backend has no human-readable `SL-####` numbers; the full id is kept in the row title.
- All authoritative balances, totals, and payment statuses come from the statement endpoint. The post-repayment preview is clearly labelled and uses integer kobo arithmetic.
- Repayments affect receivables only; stock is unchanged by design.

### 2026-10-29: FE-002 Authentication and Session Management

Added:
- Auth domain types in `src/types/auth.ts`: `AuthUser`, `AuthSession`, `SignInResponse`, `TwoFactorChallenge`, `TwoFactorMethod`, `TwoFactorVerifyResponse`, plus an `isTwoFactorChallenge` guard.
- Auth API client in `src/lib/api/auth.ts`: `fetchSession` (`GET /api/v1/auth/get-session`), `signInWithEmail` (`POST /api/v1/auth/sign-in/email`), `signOut` (`POST /api/v1/auth/sign-out`), `sendTwoFactorOtp`, `verifyTwoFactorOtp`, and `verifyTwoFactorTotp`.
- `AuthProvider` + auth context (`src/app/auth/`): loads the session on startup, exposes loading/authenticated/unauthenticated state, and clears local state when any non-auth request returns 401. No tokens are stored in JavaScript; the backend cookie is the only credential.
- `RouteGuards.tsx`: `ProtectedRoute` (redirects to `/signin`, remembers the attempted path) and `GuestRoute` (sends signed-in users to `/inventory`), with a branded session-loading screen.
- `SignInPage` (`/signin`) built from `signin.svg`: email/password form with show/hide password, two-factor step supporting authenticator-app (`verify-totp`) and emailed (`verify-otp`) codes with resend and method switching, light/dark themes, visible focus styles, and accessible labels.
- Error mapping for `INVALID_EMAIL_OR_PASSWORD`, `EMAIL_NOT_VERIFIED`, `INVALID_ORIGIN`, `INVALID_CODE`, `OTP_HAS_EXPIRED`, `TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE`, `ACCOUNT_TEMPORARILY_LOCKED`, 429, 5xx, and network failures.
- `src/lib/hooks/useTheme.ts`: shared light/dark theme hook (previously duplicated in the shell).
- `LogOutIcon` in `src/components/ui/Icons.tsx`.

Changed:
- `src/lib/api/client.ts` emits `UNAUTHORIZED_EVENT` on non-auth 401 responses so the session state and route guard react immediately.
- `InventoryLayout` shows the signed-in user's name/email, adds a sign-out control with inline failure feedback, and uses the shared theme hook.
- `src/app/router.tsx` registers `/signin` for guests and wraps all inventory routes in `ProtectedRoute`.
- `src/main.tsx` wraps the app in `AuthProvider`.

Checks:
- `bun run build`: passed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)

Notes:
- No live end-to-end sign-in was possible: the backend API (port 3000) and PostgreSQL (port 5432) were not running. Endpoint shapes, cookies, and error codes were verified from the installed backend source and the `better-auth` 1.7.x distribution.
- The backend requires `FRONTEND_URL` to match the frontend origin exactly; otherwise sign-in fails with `INVALID_ORIGIN` (mapped to an actionable message).
- Sign-up is disabled on the main auth instance, so the UI has no sign-up link; password reset and staff invitations are also out of scope.
- The Better Auth session does not expose the Owner/Staff role, so role-specific navigation cannot be derived from it. Backend guards remain authoritative and pages surface 403 responses.
- A signed-in user without an active `staff` row passes the route guard but receives 403 from staff endpoints; no verified endpoint reports staff access to the frontend.
- Two-factor backup codes are not supported in this UI; authenticator-app and emailed codes are.
- The backend's global throttler (3 requests/second per route, 100/minute) can rate-limit repeated sign-in attempts; that case is mapped to a user-facing message.

### 2026-10-28: FE-020 Record a Sale

Added:
- Sale domain types in `src/types/sale.ts`: `Sale`, `SaleItem`, `Payment`, `SaleUnit`, `CreateSaleInput`, `CreateSaleResult` (with `replayed` flag) verified against `sales.service.ts` and the schema.
- Customer types in `src/types/customer.ts` (`Customer`, `CreateCustomerInput`).
- Money helpers in `src/lib/utils/money.ts` (`toKobo`/`fromKobo`), ported from the backend so client-side totals use integer kobo arithmetic and never drift through floats.
- Sales API client in `src/lib/api/sales.ts` (`createSale` â†’ `POST /api/v1/sales`).
- Customers API client in `src/lib/api/customers.ts` (`fetchCustomers`, `createCustomer`; both StaffGuard).
- `RecordSalePage` (`/sales/new`):
  - Client-side product search (backend has no search parameter) with Pack/Bag add buttons; re-adding the same product+unit increases the line quantity (the backend rejects duplicate product+unit lines).
  - Cart lines with quantity steppers (1..1,000,000), line totals computed from DB prices like the backend, and per-product "Available: N packs" stock warnings covering combined lines.
  - Customer select with an inline "Add a customer" form (name + optional phone) so credit sales can be recorded without leaving the page.
  - Amount paid field validated with the backend regex (`^\d{1,12}(\.\d{1,2})?$`), over-payment guard, and customer-required-when-balance-remains rule.
  - Sale summary card with items, total, amount paid, balance owed, cash/credit indicator, and Save sale action (matches `sale_new.svg` two-column layout).
  - Idempotent submission: `requestId` kept across retries of an identical payload, regenerated when the sale is edited, cleared only on success.
  - 409 conflict handling with the "Save blocked" + "Refresh stock" panel (matches `sale_conflict.svg`); 404/403/400 and network errors mapped to actionable messages.
  - Success state showing total/paid/balance/customer with a `replayed` notice and "Record another sale".
- `/sales` placeholder index page with a "Record a sale" CTA (the shell nav already linked to `/sales`, which previously hit the 404 route).

Changed:
- Router registers `/sales` and `/sales/new` under `InventoryLayout`.

Checks:
- `bun run build`: passed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)

Notes:
- Backend limitation: the `payments` table has no payment-method column, so the design's "Payment method" field is not implemented.
- Backend limitation: there is no sale-type column; cash/credit is derived from `itemsTotal` vs payments.
- Backend limitation: `POST /api/v1/sales` returns `updatedProduct` as `[{ id }]` (ids only, no balances); the page refreshes products after a successful sale instead.
- Prices are never sent to the backend; `POST /api/v1/sales` prices every line from the product row server-side.
- Verified early for FE-022 (not yet used by any page): customer statement (`GET /api/v1/customers/:id/statement`) and repayments (`POST /api/v1/customers/:id/repayments`, idempotent via `requestId`) shapes recorded in API_CONTRACT.md.

### 2026-10-28: FE-012 Inventory and Stock Movements

Added:
- Stock domain types in `src/types/stock.ts`: `StockMovement`, `StockMovementsPage` (paginated envelope), `UpdatedProductStock`, `Supplier`, and mutation inputs with `requestId`/`unit` per verified backend schema.
- Stock API client in `src/lib/api/stock.ts`:
  - `fetchStockMovements(page, limit)` matching `GET /api/v1/stock/movements` paginated response (`{ data, page, limit, total }`).
  - `fetchAllStockMovements(maxPages)` accumulating pages client-side (backend has no product filter on movements).
  - `createStockAddition` and `createStockAdjustment` sending client-generated UUID `requestId` (idempotency) and `unit: 'Pack'`.
  - `fetchSuppliers` with full error propagation.
- `StockMovementsPage` (`/movements`):
  - Full stock ledger with desktop table and mobile record cards.
  - Client-side product, movement-type, and free-text filters.
  - Loading skeleton, empty, filtered-empty, and error states with retry.
  - Adjust-stock action with product selector (defaults to the URL `productId` filter).
- `ReceiveStockPage` (`/inventory/receive`):
  - Bags + loose packs entry combined into a single pack-denominated receipt.
  - Idempotent submission: `requestId` retained across retries, cleared only on success.
  - Optional supplier selection; 403/404/409 error mapping; quantity cap 1,000,000.
- `StockAdjustmentModal` (`src/components/stock/StockAdjustmentModal.tsx`):
  - Add/Sub toggle, quantity 1..1,000,000, required reason (1..500) matching backend rules.
  - Projected-balance preview with negative-balance warning.
  - Idempotent `requestId` pattern; `OwnerGuard` 403 and 409 conflict messaging.

Changed:
- `ProductDetailPage`: per-product movement history (last 5) loads via `fetchAllStockMovements`; adjustment success merges partial `{ id, stockPacks }` updates instead of expecting full product objects.
- `fetchSuppliers` no longer swallows errors; callers handle failures (ReceiveStockPage degrades to a non-blocking warning).

Fixed:
- `StockMovementsPage` referenced an undefined `loadData` function (compile error).
- ReceiveStockPage error banner referenced nonexistent tokens (`--color-danger-soft`, `--color-danger-border`); now uses `--color-danger-bg` and `--color-border`.

Checks:
- `bun run build`: passed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)

Notes:
- Backend limitation: `GET /api/v1/stock/movements` has no `productId` filter; per-product history is filtered client-side over accumulated pages (capped at 10 pages x 100).
- Backend limitation: `createStockSchema` has no note/reference fields, so the receive form has no receipt-reference or notes input.
- Backend limitation: addition/adjustment responses return only `{ id, stockPacks }` per product (`UpdatedProductStock`), not full product objects.
- Verified but unused in this phase: supplier management routes (`POST /api/v1/suppliers/add`, `PATCH /api/v1/suppliers/update/:id` are `OwnerGuard`; `GET /api/v1/suppliers/:id` exists) belong to FE-040.

### 2026-10-27: FE-011 Product Details and Setup

Added:
- API functions `fetchProductById`, `createProduct`, and `updateProduct` in `src/lib/api/products.ts`.
- Mutation DTO types `CreateProductInput` and `UpdateProductInput` in `src/types/product.ts`.
- `ProductDetailPage` (`/inventory/:id`):
  - Available stock metric card with bag/loose pack conversion.
  - Pack and bag price cards formatted in Nigerian Naira.
  - Product setup summary: brand, category, base unit, bag conversion, pieces per pack, active status.
  - Actions for stock receiving and stock movements.
  - Loading skeleton, 404 not found, and error handling with retry.
- `ProductSetupPage` (`/inventory/new` and `/inventory/:id/edit`):
  - Form fields matching verified schema: name, brandId, categoryId, packName, size, piecesPerPack, packsPerBag, retailPrice, bagPrice, active.
  - Client-side validation for required fields, positive integer quantities, and positive prices.
  - Authorization feedback handling for `OwnerGuard` 403 Forbidden responses.
  - Loading, cancel, and save actions.
- Routes `/inventory/new`, `/inventory/:id`, and `/inventory/:id/edit` registered in `AppRouter`.

Checks:
- `bun run build`: passed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)

### 2026-10-27: FE-010 Product List and Search

Added:
- Product API client functions (`fetchProducts`, `fetchCategories`, `fetchBrands`) with parameter serialization.
- Verified TypeScript domain types (`Product`, `Category`, `Brand`, `PackName`).
- Formatting utilities for Nigerian Naira currency and stock status thresholds.
- Reusable Lucide-matching SVG icon set (`PackageIcon`, `SearchIcon`, `PlusIcon`, `MoonIcon`, `SunIcon`, `AlertCircleIcon`, `RefreshCwIcon`, etc.).
- Complete responsive Inventory view (`InventoryPage`):
  - Search input with clear button and category dropdown.
  - Category / pack type filter pills.
  - Desktop data table with product name, size, category, stock packs, price, and status badge.
  - Mobile card view matching `Mobile_Light/inventory.svg`.
  - Loading skeleton for table and mobile cards.
  - Empty inventory state with primary CTA matching `inventory_empty.svg`.
  - No matching results state with filter clear action.
  - Error state with retry action and authorization notice.
- Active route highlighting and routing integration in `InventoryLayout`.
- Font assets copied to `src/styles/Fonts` for reliable font bundling.

Checks:
- `bun run build`: passed
- `bunx tsc -b --noEmit`: passed (strict type checking)
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)

Notes:
- Documented backend limitation: `GET /api/v1/products` does not support free-text query; search is handled client-side over retrieved records.
- Documented backend limitation: `products` table does not contain an `sku` column.


## Entry Template

When a task is completed, add an entry using this format:

### YYYY-MM-DD: Task ID and Name

Added:
- ...

Changed:
- ...

Fixed:
- ...

Checks:
- ...

Notes:
- ...


### 2026-11-02: Historical acquisition cost repair

Added: grouped missing sale-cost detection and owner-only, transactionally guarded repair of null sale-item snapshots. Profit reporting now returns explicit missing-cost details and withholds incomplete profit. Sale details includes a confirmation dialog; profit reports link affected sales.

Checks: frontend lint, typecheck, 113 tests, build, and diff check passed. Backend lint/build passed; Vitest worker failed to start before tests ran. No production data accessed or modified.
