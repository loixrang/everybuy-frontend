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
Status: BLOCKED

- Inspect sale creation rules.
- Support the actual product units and quantities.
- Validate stock availability.
- Handle failed and conflicting submissions.
- Prevent accidental duplicate submissions.

### FE-021: Sales History and Details
Status: BLOCKED

- Display sales using verified API responses.
- Show sale items, payment information, and balances.
- Support available search and filtering.

### FE-022: Payments and Repayments
Status: BLOCKED

- Inspect payment and repayment endpoints.
- Display payment history.
- Implement supported payment recording.
- Show outstanding balances accurately.

## Phase 3: Purchases and Stock Receiving

### FE-030: Purchase Management
Status: BLOCKED

- Inspect purchase and supplier capabilities.
- Implement only supported purchase workflows.

### FE-031: Receive Stock
Status: BLOCKED

- Inspect stock receiving endpoints and validation rules.
- Support the backend's stock unit and conversion rules.
- Display the saved receipt and resulting stock changes.

## Phase 4: Follow-up Work

### FE-040: Customers and Suppliers
Status: BLOCKED

Implement after verifying the relevant backend endpoints and permissions.

### FE-041: Stocktaking
Status: BLOCKED

Implement after verifying stock count, review, and approval workflows.

### FE-042: Reports and Overview
Status: BLOCKED

Use verified reporting endpoints and calculations. Do not calculate important business figures from incomplete frontend data.

### FE-043: Online Store
Status: BLOCKED

The design reference contains a separate online store. Do not implement it until the user approves its scope and the backend contract is confirmed.

## Rules

- Do not start a blocked task without resolving its dependencies.
- Do not implement several roadmap phases in one session without approval.
- Update statuses when work starts or finishes.
- Keep each task small enough to review and test.
- Record missing backend capabilities rather than inventing them.