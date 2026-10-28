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

Status: READY
- Implement the sign-in page using the existing Better Auth backend.
- Verify the sign-in request and response against the actual backend configuration.
- Handle session loading, authenticated sessions, and unauthenticated users.
- Protect application routes that require authentication.
- Implement sign-out.
- Handle two-factor authentication if required by the backend configuration.
- Handle authentication errors and expired sessions.
- Verify that cookies and credentials work in local development and production.
- Test the complete flow from sign-in through sign-out.


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
Status: BLOCKED

- Verify the current sales list and detail endpoints.
- Display recorded sales and their saved item details.
- Show sale date, items, quantities, prices, total, initial payment, and outstanding balance where supported.
- Add only search and filters supported by the API.
- Handle loading, empty, and error states.
- Confirm historical sale details remain correct after product changes.

### FE-022: Customer Debts and Repayments
Status: BLOCKED

- Verify the current customer, debt, and payment endpoints.
- Allow staff to find customers and view their outstanding sales.
- Display each sale's original total, payments received, and remaining balance.
- Record repayments against the correct sale.
- Show payment history and updated balances after successful requests.
- Handle overpayment, duplicate submissions, and failed requests.
- Do not calculate authoritative balances from incomplete frontend data.

## Phase 3: Stock Receiving

### FE-031: Receive Stock
Status: BLOCKED

- Verify the current stock receiving endpoint and request format.
- Support receiving stock in bags or retail packs, as allowed by the API.
- Display the correct pack conversion for each product.
- Allow supplier details only where supported and required by the agreed workflow.
- Show the saved receipt and updated stock after success.
- Handle invalid quantities, failed requests, and duplicate submissions.
- Confirm the stock balance matches the backend response.

Note: Keep FE-030 Purchase Management deferred. Do not build a separate purchase workflow unless it is part of the agreed scope and supported by the backend.

## Phase 4: Customers and Reports

### FE-040: Customer Management
Status: BLOCKED

- Verify customer creation, lookup, update, and deactivation capabilities.
- Implement only operations supported by the current API.
- Allow staff to find customers when recording sales and repayments.
- Preserve access to existing debt and payment history for deactivated customers.
- Respect backend permissions and validation rules.

### FE-042: Monthly Reports and Overview
Status: BLOCKED

- Verify the current reporting endpoints and response formats.
- Display monthly sales totals and money received.
- Show outstanding debt at month-end where supported.
- Display product sales and stock figures returned by the backend.
- Use the correct Africa/Lagos calendar month.
- Ensure later payments do not incorrectly change historical report figures.
- Handle empty months and failed requests.
- Do not derive official totals from incomplete frontend data.

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