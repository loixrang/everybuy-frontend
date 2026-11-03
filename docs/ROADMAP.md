# Frontend Roadmap

### Historical acquisition cost repair across both repositories
Status: WORKING

- Sale details detects missing historical snapshots and supports owner-confirmed repair; profit report withholds incomplete profit and links the affected sales. Backend build and frontend checks pass locally. Backend Vitest could not start a worker in this environment.


This roadmap tracks the frontend only. Backend capabilities must be verified before implementation.

Statuses:

- READY: Can be started.
- WORKING: In progress.
- BLOCKED: Waiting for a dependency or missing information.
- COMPLETED: Acceptance criteria are satisfied and checks pass.

## Phase 0: Foundation

### FE-064: Theme Preferences and Startup Theme Initialization
Status: WORKING

- Add persistent Light, Dark, and Device preferences with synchronous pre-React theme selection.
- Settings exposes all three choices; Device follows operating system changes.

### FE-063: POS Search and Cart Refactor
Status: COMPLETED

- Replace Record a sale's floating product dropdown with inline search results, add-to-cart rows, and an adjustable pack/bag cart.
- Preserve the verified sale payload and customer/payment workflow; use stock in packs and the backend's per-product `packsPerBag` conversion.
- Checks passed: typecheck, lint, production build, and `git diff --check`.

### FE-062: Owner Category and Brand Management
Status: COMPLETED

- Owner-only catalog page is implemented at `/settings/catalog`; lists all active and inactive records and supports create, soft-deactivate, and reactivate through verified category and brand endpoints.
- Product setup now offers active categories and brands only.
- Backend category POST and PATCH owner enforcement was rechecked on 2026-10-30: both routes apply OwnerGuard alongside StaffGuard. Brand create/update are also owner protected.
- Checks passed: typecheck, lint, 109 tests, production build, and `git diff --check`. Live API scenarios were not exercised.


### FE-057: Audit and Complete Two-Factor Authentication and OTP
Status: BLOCKED

- Audit Better Auth 1.7.10's exact login challenge, TOTP, email OTP, backup code, error, and rate-limit behavior.
- Frontend implements authenticated TOTP setup/verification/disable and backup-code recovery, plus email OTP and backup-code login. Challenge-cookie gating remains in place.
- Blocked from full completion: Better Auth 1.7.10 swallows email sender callback failures and still returns `{ status: true }`; the frontend cannot distinguish provider failure from an accepted request. OTP storage is plaintext by default. Backend changes are excluded per the user's direction.
- Frontend typecheck, lint, 37 tests, production build, and `git diff --check` pass. Live verification was unavailable because the API and database were not running.

### FE-056: Fix Email Verification Flow
Status: COMPLETED

- Explicit verification email request after Better Auth rejects sign-in with `EMAIL_NOT_VERIFIED`.
- Accurate success, error, loading, resend and cooldown states; endpoint confirmed against backend configuration and Better Auth 1.7.x.
- Checks passed: typecheck, lint, 27 tests, production build, and `git diff --check`. Live provider delivery remains unverified from this environment.

### FE-001: Frontend Foundation
Status: COMPLETED

- React, TypeScript, Vite, and Tailwind setup
- Routing
- Design tokens and typography (Poppins primary, Inter fallback)
- Light and dark themes
- Responsive inventory application shell (desktop sidebar, mobile bottom nav)
- API client foundation (configurable base URL, credentials included)
- Development checks (typecheck, lint, build configured)
- Backend contract inspection (Better Auth, routes, roles, CORS verified)
- Documentation updated

### FE-002: Authentication and Session Management

Status: COMPLETED

- Implemented the sign-in page using the existing Better Auth backend (`/signin`, matching `signin.svg`).
- Session bootstrap via `GET /api/v1/auth/get-session`; no frontend token storage.
- Protected application routes (`ProtectedRoute`/`GuestRoute`) and automatic redirect on expired sessions (401).
- Sign-out via `POST /api/v1/auth/sign-out` with an inline error if revocation fails.
- Two-factor challenges handled for authenticator-app codes and emailed codes.
- Invalid credentials, unverified email, untrusted origin, rate limits, and network failures mapped to user-facing messages.
- Verified endpoint and response shapes against the installed backend and `better-auth` 1.7.x.
- Not live-tested: the backend and PostgreSQL were not running in this environment.


## Phase 1: Products and Stock

### FE-010: Product List and Search
Status: COMPLETED

- Inspect available product endpoints.
- Display products using the verified response format.
- Add search and filters supported by the backend.
- Handle loading, empty, and error states.

### FE-011: Product Details and Setup
Status: COMPLETED

- Inspect product creation and update endpoints.
- Display product details.
- Implement supported product forms.
- Validate inputs using backend rules.
- Respect actual permissions.

### FE-012: Inventory and Stock Movements
Status: COMPLETED

- Inspect stock and stock movement endpoints.
- Display available stock.
- Display movement history.
- Implement only stock actions supported by the backend.
- Note: the stock receiving form (`/inventory/receive`) was implemented here as the stock-additions flow; broader purchase workflows remain in FE-030/FE-031.

## Phase 2: Sales and Payments

### FE-020: Record a Sale
Status: COMPLETED

- Inspect sale creation rules.
- Support the actual product units and quantities.
- Validate stock availability.
- Handle failed and conflicting submissions.
- Prevent accidental duplicate submissions.

### FE-021: Sales History and Details
Status: COMPLETED

- Server-paginated sales list (`/sales`) with sale reference, customer name, date, and total.
- Customer names mapped from one customer-list request; no per-sale statement fan-out.
- Sale detail (`/sales/:id`) with saved item snapshots, bag/pack quantities, unit prices, and line totals.
- Customer sales load one statement request for paid amount, balance, status, and payment history.
- Repayment action from the detail page, reusing the shared repayment dialog.
- Loading, empty, pagination, 404, 401/403, statement-failure, and network states.

Verified limitations:
`GET /api/v1/sales` accepts only `page` and `limit` and returns no items, payments, or balance, so the design's search, payment-state filter, Owed/Status columns, and daily summary cards are omitted. Paid/balance data for a single viewed sale comes from one customer statement request; doing this per list row would exceed the 3 requests/second throttle. Walk-in sales are shown as paid at sale because the backend rejects a balance without a customer. Payment method and recorded-by names are not stored/resolvable.

### FE-022: Customer Debts and Repayments
Status: COMPLETED

- Customer directory with name/phone search, status filters, add-customer dialog, and links to each statement.
- Customer statement from `GET /api/v1/customers/:id/statement` with backend totals, outstanding sales, and payment history.
- Repayment dialog against a selected outstanding sale, with exact kobo preview, overpayment validation, and idempotent `requestId`.
- Customer edit screen for name, phone, and active status.
- Loading, empty, error, and success states; 400/401/403/404/409/429 handling.

Verified limitations:
`GET /api/v1/customers` returns no balances or last-sale data, so the directory omits those design columns rather than fanning out one statement request per customer (beyond the 3 requests/second throttle); the statement is authoritative for balances. The `payments` table has no method, entered-date, or reference columns, so those repayment fields and the "At sale"/"Repayment" type distinction are omitted. Sale references use the first 8 characters of the UUID because the backend has no `SL-####` numbers. Customer address, town/LGA, state, and notes are not stored.

## Phase 3: Stock Receiving

### FE-031: Receive Stock
Status: COMPLETED

- Implemented in FE-012 as the stock-additions flow at `/inventory/receive`.
- Supports bags plus loose packs combined into a pack-denominated receipt.
- Shows the saved receipt and the backend-returned stock balance.
- Handles invalid quantities, failed requests, duplicate submissions (`requestId`), and `OwnerGuard`/`StaffGuard` failures.
- Optional supplier selection uses the verified suppliers endpoint.

Note: Keep FE-030 Purchase Management deferred. Do not build a separate purchase workflow unless it is part of the agreed scope and supported by the backend.

## Phase 4: Customers, Reports and Settings

### FE-040: Customer Management
Status: COMPLETED

- Create, list, read, and update customers through the shared `/customers` screens.
- Deactivate/reactivate through the `active` field; statement and payment history remain available for inactive customers.
- Staff can find customers while recording a sale (inline add) and via the directory when recording repayments.
- Only backend-supported fields are shown: name, phone, active status, and timestamps.

Verified limitation:
The directory's design columns "Balance owed" and "Last sale" cannot be populated from `GET /api/v1/customers` without per-customer statement requests; they are shown on the customer statement instead. There is no delete endpoint, so customers are deactivated rather than removed.

### FE-042: Monthly Reports and Overview
Status: COMPLETED

- Verify the current reporting endpoints and response formats.
- Display the daily overview, monthly totals, and profit figures from their verified report endpoints.
- Display monthly sales totals and money received.
- Show outstanding debt at month-end where supported.
- Display product sales and stock figures returned by the backend.
- Use the correct Africa/Lagos calendar month.
- Ensure later payments do not incorrectly change historical report figures.
- Handle empty months and failed requests.
- Do not derive official totals from incomplete frontend data.

Implemented scope:
`/overview` has Today, Monthly, and Profit tabs backed by `GET /api/v1/reports/overview`, `/reports/monthly?month=YYYY-MM`, and `/reports/profit?month=YYYY-MM`. All are StaffGuard endpoints. The daily report shows today's sales, payments received, outstanding customer balances, low-stock products (10 packs or fewer), and five recent sales. Monthly and profit tabs show backend-computed totals using the Africa/Lagos calendar. Month values are validated, and all tabs handle loading, empty, error, and retry states.

Verified limitation:
The profit endpoint returns 409 when a sale in the month lacks a recorded product cost; the UI explains that profit cannot be calculated rather than substituting zero. `moneyReceived` includes payments for earlier sales, and `outstandingDebtAtMonthEnd` is cumulative debt at month end; the screen explains both. See DEC-018.

### FE-050: Settings and Team Access
Status: COMPLETED

- Replace the dead "Team & preferences" link with a real `/settings` page.
- Show the signed-in profile (name, email, verification, member since, two-factor state).
- Provide a working appearance preference (light/dark).
- List team members for owners and support adding staff.
- Support the emailed invitation flow, including the public acceptance page.
- Explain settings the backend cannot support yet.

Verified limitations:
`GET /api/v1/staff` now also returns `email`, `active`, `createdAt`, and role changes/deactivation are available through `PATCH /api/v1/staff/:staffId`. There is no endpoint to remove a member or to edit the signed-in profile/password. There is also no current-user role endpoint, so owner-only UI is inferred from the staff-list 403. The invitation flow was verified and completed in FE-060; see `docs/API_CONTRACT.md`.

### FE-051: Branding, Dark Theme, Cursor Affordances and Tests
Status: COMPLETED

- Use Everybuy branding everywhere instead of the design placeholder name.
- Make the dark theme neutral and genuinely dark rather than green-tinted.
- Give clickable and disabled elements the correct cursor.
- Add an automated unit test suite and repair the leftover Vite template metadata.

Verified limitations:
Theme and cursor changes are CSS-level and were validated through the production bundle; there is no visual regression setup. Component tests would require adding a DOM test library, which is not part of the current stack. See DEC-020 and DEC-021.

### FE-052: Pack and Bag Unit Terminology
Status: COMPLETED

- Use the backend's units (packs and bags) throughout the interface instead of the design's "carton" wording.
- Rename the receive-stock form state and inputs to match.

Verified limitation:
None — the backend enum is `Bag` | `Pack` and the fields were already `packsPerBag` / `bagPrice`, so this was a copy correction with no API change. See DEC-022.

### FE-053: Mobile Navigation and Responsive Polish
Status: COMPLETED

- Five-tab mobile navigation (Stock, Sale, Customers, Reports, More) so every section is reachable below `lg`.
- "More" bottom sheet for Movements and Settings, with dialog semantics, focus handling, scroll lock, and breakpoint/popstate dismissal.
- Safe-area support (notch and home indicator), 44 px touch targets, and a `100dvh` layout height.
- Sticky desktop sidebar, so desktop navigation stays visible on long pages.
- Mobile card alternatives for product movements and the movements ledger; capped, scrollable sale search results.
- Dialogs become bottom sheets on phones; filter chips scroll without a scrollbar; inputs avoid iOS focus zoom.

Verified limitation:
Responsive changes were validated through code review and the compiled CSS; no device/emulator automation exists, so iOS safe areas and the More sheet still need a manual phone pass. See DEC-023.

## Phase 5: Contract Reconciliation

### FE-054: Verify Existing Financial and Shop Administration Integrations
Status: COMPLETED

- The frontend contains Expenses (`/expenses`), Audit (`/audit`), Daily Overview and Profit Report (`/overview`), and Shop Settings UI/API support.
- These capabilities were missing from the prior roadmap and contract verification records; this task reconciles both.
- Inspect the backend routes, DTOs, response shapes, roles, and permission guards; update `docs/API_CONTRACT.md` and record implementation status accurately.
- Verified contracts are documented and the existing implementation is recorded above.

Verified on 2026-10-29 against backend controllers, services, DTOs, database schemas, and guards. Expenses and Audit use StaffGuard; Reports use StaffGuard; Shop Settings GET uses StaffGuard and PATCH also requires OwnerGuard. Details are recorded in `docs/API_CONTRACT.md`.

Completion checks: typecheck, lint, 24 tests, production build, and `git diff --check` passed.

## Phase 6: Release Preparation

### FE-055: Search Visibility, Performance, and CI/CD Preparation
Status: COMPLETED

- Keep this authenticated application out of search indexes and provide useful route titles.
- Split page modules into independently loaded chunks.
- Support deployment base paths for Vite assets and browser routes.
- Add GitHub Actions checks for typecheck, lint, tests, and production build.
- Add an opt-in GitHub Pages deployment of the verified artifact, gated on the production API URL and base path variables.
- Document frontend/backend origin and cookie requirements.

Checks passed locally: typecheck, lint, 24 tests, production build, and `git diff --check`. The GitHub workflow itself needs a first hosted run after push; Pages deployment is skipped until the documented variables and Pages setting are configured.

## Phase 7: Product Quality

### FE-061: Owner Passkey and Authenticator-App Two-Factor Security
Status: COMPLETED

- Verify the backend passkey plugin, owner authentication hook, TOTP endpoints, and Better Auth client methods before implementing.
- Add an owner-only `/settings/security` page with `OwnerRoute`, reached from `/settings`; staff are redirected with a notice and backend enforcement remains authoritative.
- TOTP enrolment with QR and manual key, verification before enabling, one-time backup codes with acknowledgment and download, regeneration, and password-confirmed disable.
- Passkey listing, owner-named registration, rename, and confirmed deletion with a last-method warning.
- Passkey sign-in that adopts the returned session and does not trigger the TOTP challenge.
- Keep tokens, challenges, setup keys, QR contents, backup codes, and credential payloads out of storage and logs.
- Tests for TOTP URI handling and passkey error mapping.

Checks passed: typecheck, lint, 81 tests, production build, and `git diff --check`. Live WebAuthn registration/sign-in and TOTP enrolment need a running backend, owner credentials, and an authenticator, so they remain unverified end to end. The backend `better-auth`/passkey peer-version mismatch is tracked in `Issues.md`.

### FE-060: Staff Invitation Flow
Status: COMPLETED

- Verify the owner invite, invitation list, revoke, public preview, and public accept endpoints against the backend source.
- Owner invitation form sends only the fields the backend accepts, with validation and actionable success/failure feedback.
- Owner view of the pending invitation with derived status, expiry, and revoke.
- Public `/invite/accept` route outside the auth guards and dashboard, with the legacy `/accept-invite` path redirecting to it.
- Token preview plus password creation with local validation, duplicate-submit protection, safe error copy, and no token retention or automatic sign-in.
- Tests for invitation logic, API payloads, and the rendered public page states.

Checks passed: typecheck, lint, 64 tests, production build, and `git diff --check`. A live owner-to-recipient run needs owner credentials and a real pending token, which are not available in this environment. Verified backend limitations (no role at invite time, ambiguous 400 for unavailable tokens, an invitation list that includes accepted rows) are recorded in `docs/API_CONTRACT.md` and `Issues.md`.

### FE-059: Settings UX and Progressive Disclosure
Status: COMPLETED

- Show saved shop and profile information first; open editing controls only after an explicit action.
- Reveal security and team-management controls only when selected.
- Review all major pages and preserve dedicated workflows where forms are the primary purpose.
- Keep existing APIs, validation, permissions, and responsive behavior.

Checks passed: typecheck, lint, 37 tests, production build, and `git diff --check`. UI interactions were reviewed in code; the project has no browser/component automation setup.

### FE-058: Move Technical Backend Limitations Out of User-Facing Copy
Status: COMPLETED

- Remove backend implementation details and unsupported-feature explanations from customer-facing screens.
- Keep actionable, plain-language guidance where a user needs it to proceed.
- Track verified backend gaps in root `Issues.md` for engineering follow-up.
- Preserve the existing API contract and do not modify backend files.

Checks passed: typecheck, lint, 37 tests, production build, and `git diff --check`.

## Blocked and Deferred Work

### FE-041: Stocktaking
Status: WORKING

- Stocktake API is now present in the backend checkout: `StockTakesModule` is registered in `AppModule`, and `StockTakesController` exposes create, list, detail, count, finalize, and cancel routes.
- Frontend implementation is in progress in `src/pages/stocktakes/`, `src/components/stocktakes/`, and `src/lib/api/stockTakes.ts`.
- Owner-only finalize and cancel controls; staff can record counts. Backend remains authoritative for permissions and status transitions.
- Frontend typecheck, lint, tests, and production build pass. Live end-to-end verification against a running API and database remains outstanding.

### FE-043: Online Store
Status: DEFERRED

- Do not implement until explicitly approved.
- Confirm the online ordering scope and API contract before starting.

## Rules

- Use the current API contract and verify it against the actual backend.
- Do not invent routes, request fields, response fields, or permissions.
- Mark a task COMPLETED only after its acceptance criteria pass.
- Update frontend types and API calls when the contract changes.
- Test success, validation errors, authentication failures, and network failures.
- Keep each task focused and reviewable.
- Deferred tasks must not block the physical shop release.


## Negotiated pricing and Half Bag

Status: IMPLEMENTED — backend/frontend checks pass; database migration and live verification are deployment steps.

- Independent default/minimum prices for Pack, Half Bag, and Full Bag.
- Sale line agreed price snapshots and minimum enforcement.
- Half Bag consumes half the configured packs per bag; only even pack counts can enable it.
- Apply backend migration `0003_negotiated_half_bag_pricing.sql`.
