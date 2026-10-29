# Frontend Roadmap

This roadmap tracks the frontend only. Backend capabilities must be verified before implementation.

Statuses:

- READY: Can be started.
- WORKING: In progress.
- BLOCKED: Waiting for a dependency or missing information.
- COMPLETED: Acceptance criteria are satisfied and checks pass.

## Phase 0: Foundation

### FE-001: Frontend Foundation
Status: COMPLETED

- React, TypeScript, Vite, and Tailwind setup
- Routing
- Design tokens and typography (Manrope/Inter, tokens.css integrated)
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
- Sale detail (`/sales/:id`) with saved item snapshots, carton/pack quantities, unit prices, and line totals.
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
- Supports cartons plus loose packs combined into a pack-denominated receipt.
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
- Display monthly sales totals and money received.
- Show outstanding debt at month-end where supported.
- Display product sales and stock figures returned by the backend.
- Use the correct Africa/Lagos calendar month.
- Ensure later payments do not incorrectly change historical report figures.
- Handle empty months and failed requests.
- Do not derive official totals from incomplete frontend data.

Implemented scope:
`/overview` is a monthly report using `GET /api/v1/reports/monthly?month=YYYY-MM`. It shows `salesTotal`, `moneyReceived`, `outstandingDebtAtMonthEnd`, product quantities sold (cartons, packs, total packs), and month-end `closingStock`, with month navigation, "This month", loading/empty/error/retry states, and staff-access handling. The month defaults to the current `Africa/Lagos` month and is validated against the backend pattern.

Verified limitation:
The supplied `overview.svg` is a *daily* shop summary ("Sales today", "Payments received", "Customer balances", "Low stock", "Recent sales"). No daily aggregate exists: the sales list returns no totals or balances and the customer list returns no balances. The daily cards, low-stock alert, and recent-sales table are therefore omitted rather than computed in the frontend. `moneyReceived` includes payments for earlier sales, and `outstandingDebtAtMonthEnd` is cumulative debt at month end; the screen explains both. See DEC-018.

### FE-050: Settings and Team Access
Status: COMPLETED

- Replace the dead "Team & preferences" link with a real `/settings` page.
- Show the signed-in profile (name, email, verification, member since, two-factor state).
- Provide a working appearance preference (light/dark).
- List team members for owners and support adding staff.
- Support the emailed invitation flow, including the public acceptance page.
- Explain settings the backend cannot support yet.

Verified limitations:
`GET /api/v1/staff` returns only `{ staffId, userId, name, role }` (no email, active flag, or timestamps). There are no endpoints to change roles, deactivate members, list/revoke pending invitations, or edit the signed-in profile/password. There is also no current-user role endpoint, so owner-only UI is inferred from the staff-list 403. Staff invitation emails require `STAFF_INVITE_PREVIEW_URL`, currently unset, so the password mode is offered as a fallback. See DEC-019.

### FE-051: Branding, Dark Theme, Cursor Affordances and Tests
Status: COMPLETED

- Use Everybuy branding everywhere instead of the design placeholder name.
- Make the dark theme neutral and genuinely dark rather than green-tinted.
- Give clickable and disabled elements the correct cursor.
- Add an automated unit test suite and repair the leftover Vite template metadata.

Verified limitations:
Theme and cursor changes are CSS-level and were validated through the production bundle; there is no visual regression setup. Component tests would require adding a DOM test library, which is not part of the current stack. See DEC-020 and DEC-021.

## Deferred Work

### FE-041: Stocktaking
Status: DEFERRED

- Do not implement until stocktaking is included in the agreed scope.
- Before implementation, verify the backend supports stock counts and the required adjustment workflow.

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