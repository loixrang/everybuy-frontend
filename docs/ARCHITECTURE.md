# Frontend Architecture

## Purpose

This document describes the intended frontend structure.

Update it as the actual implementation develops. Do not treat proposed files or libraries as already implemented.

## Technology

- React
- TypeScript
- Vite
- Tailwind CSS
- Bun

## Design Reference

The visual specification is maintained in:

design/Everyday_Offline_Design/

The current application is the physical inventory system.

The online store is separate future scope.

## Implemented Structure

```text
src/
  app/
    auth/
      AuthProvider.tsx
      RouteGuards.tsx
      auth-context.ts
    router.tsx
  components/
    customers/
      AddCustomerModal.tsx
      CustomerStatusBadge.tsx
      RecordRepaymentModal.tsx
    layout/
      InventoryLayout.tsx
    stock/
      StockAdjustmentModal.tsx
    ui/
      Icons.tsx
  lib/
    api/
      auth.ts
      client.ts
      customers.ts
      products.ts
      reports.ts
      sales.ts
      stock.ts
    hooks/
      useTheme.ts
    utils/
      format.ts
      money.ts
  pages/
    auth/
      SignInPage.tsx
    customers/
      CustomerDetailPage.tsx
      CustomerEditPage.tsx
      CustomersPage.tsx
    inventory/
      InventoryPage.tsx
      ProductDetailPage.tsx
      ProductSetupPage.tsx
    reports/
      OverviewPage.tsx
    sales/
      RecordSalePage.tsx
      SaleDetailPage.tsx
      SalesPage.tsx
    stock/
      ReceiveStockPage.tsx
      StockMovementsPage.tsx
  styles/
    index.css
    tokens.css
    Fonts/
      Inter.ttf
      Manrope.ttf
  types/
    auth.ts
    customer.ts
    product.ts
    report.ts
    sale.ts
    stock.ts
  main.tsx
  App.tsx
```


## Responsibilities

### App

Application entry point, global providers, and route configuration.

### Components

Reusable UI components that are not tied to one business feature.

### Features

Components, hooks, types, and API functions related to a particular feature.

### Layouts

Shared page structures, including the authenticated inventory layout.

### API Client

Shared configuration and request handling.

### Types

Shared types that genuinely apply across multiple features.

### Styles

Global CSS, theme definitions, and integration of design tokens.

## API Integration

Keep HTTP communication outside presentation components.

Use the verified backend contract to define request and response types.

Do not create frontend types based on guessed response structures.

Do not duplicate backend business rules unnecessarily.

The frontend can validate inputs for usability, but the backend remains responsible for enforcing business rules.

## Authentication

Use the existing backend authentication implementation.

Implemented (FE-002):

- `src/lib/api/auth.ts` calls the verified Better Auth endpoints under `/api/v1/auth`.
- `AuthProvider` loads `GET /api/v1/auth/get-session` at startup and exposes `signIn`, `verifyTwoFactor`, and `signOut` through `useAuth`.
- No tokens are persisted in JavaScript; the browser sends the backend's HttpOnly session cookie because `apiFetch` uses `credentials: 'include'`.
- `ProtectedRoute` blocks inventory routes until a session is confirmed and redirects to `/signin` (remembering the attempted path). `GuestRoute` keeps signed-in users off `/signin`.
- `apiFetch` emits `everybuy:unauthorized` when a non-auth request returns 401; the provider clears local session state so the guard redirects immediately.
- The sign-in screen handles authenticator-app and emailed two-factor codes when the backend asks for one.
- The Better Auth session exposes no role. Owner/Staff permissions remain backend-enforced; pages surface 403 responses rather than guessing the role.

Do not implement a separate authentication system.

## Customers, Statements, and Repayments

Implemented (FE-022, also covering FE-040's supported scope):

- `CustomersPage` (`/customers`) loads the full customer list once, filters name/phone and active status client-side, and creates customers through `AddCustomerModal`. It does not request a statement per row.
- `CustomerDetailPage` (`/customers/:id`) makes a single `GET /api/v1/customers/:id/statement` request. All balances, per-sale paid/owed amounts, payment statuses, and totals come from that response; the frontend does not assemble authoritative balances from separate calls.
- `RecordRepaymentModal` posts `{ requestId, saleId, amount }` to the selected customer's repayment endpoint. It keeps the same `requestId` across retries of an unchanged repayment and resets it when the sale or amount changes. After success, the detail page refetches the statement and shows the backend's updated totals.
- `CustomerEditPage` (`/customers/:id/edit`) updates only `name`, `phone`, and `active`; deactivated customers retain their statements and payment history.
- Sale and payment identifiers are UUIDs, so list/detail tables render a short `#` prefix plus the first 8 characters and keep the full id in the `title` attribute. There is no frontend-only sale numbering.
- The repayment method/date/reference fields and the directory's balance/last-sale columns are intentionally absent because the backend does not store or aggregate them. See `DECISIONS.md`.

## Sales History and Detail

Implemented (FE-021):

- `SalesPage` (`/sales`) requests one server-paginated page (`page`, `limit=20`) and one customer list in parallel. Customers are mapped client-side for names; no statement requests are made per row. If the customer request fails, sales still render with short customer ids.
- `SaleDetailPage` (`/sales/:id`) requests the sale with its saved item snapshots. If the sale has a customer, it then requests that customer's statement once and selects the matching sale for paid amount, balance, payment status, and payment history.
- Items render from the sale-item snapshots (`productName`, `unit`, `quantity`, `packsPerUnit`, `unitPrice`, `lineTotal`), so later product edits do not rewrite historical lines.
- A sale with no customer is treated as paid at sale. This follows the verified backend rule that a customer is required whenever `amountPaid < itemsTotal`; no payment method is inferred or stored.
- Repayments from the detail page reuse `RecordRepaymentModal` and reload both the sale and its statement after success.
- The sales list omits search, payment-state filters, Owed/Status columns, and daily summary cards because the backend provides no matching query or aggregate. The detail page is the supported place for payment data. See `DECISIONS.md`.

## Monthly Reports

Implemented (FE-042):

- `OverviewPage` (`/overview`) requests `GET /api/v1/reports/monthly?month=YYYY-MM` for one Africa/Lagos calendar month and renders the backend's numbers; it never recomputes totals from other endpoints.
- The initial month comes from `currentLagosMonth()` (an `Intl` lookup forced to `Africa/Lagos`), so the browser's local timezone cannot select the wrong month. Previous/Next controls use `shiftMonth`, the `type="month"` input is validated against the backend pattern (including the `0000` rejection), and a "This month" shortcut appears when browsing history.
- Summary cards show `salesTotal`, `moneyReceived`, `outstandingDebtAtMonthEnd`, and the number of product lines in `productsSold`.
- `productsSold` renders as a table (desktop) and cards (mobile) with cartons, packs, and total packs. `closingStock` renders as a pack balance list with a link to inventory.
- Closing stock is labelled as a month-end balance and does not reuse the live stock badge: the 10-pack low-stock threshold is a current-inventory heuristic and would mislabel a historical balance.
- Loading skeleton, empty month, 401/403, validation/network error, and retry states are handled. Month changes refetch; stale responses are discarded with an `ignore` flag.
- The daily `overview.svg` cards (Sales today, Payments received, Customer balances, Low stock, Recent sales) are omitted because there is no daily aggregate endpoint. See `DECISIONS.md`.

## State

Start with React state and context where appropriate.

Add a state management dependency only when the actual application requirements justify it.

Do not duplicate server data unnecessarily.

## Error Handling

Provide consistent handling for:

- Loading
- Empty results
- Validation errors
- Authentication failures
- Permission failures
- Network errors
- Unexpected server errors

Do not expose sensitive internal server details to users.

## Design System

Use the design tokens and supplied SVGs as the source of truth.

Keep colors, typography, spacing, borders, and theme behavior consistent.

Use reusable components where they reduce duplication without making the code difficult to understand.

## Testing

Test important user interactions, form validation, API handling, and business-critical calculations where relevant.

Run type checking, linting, tests, and the production build as configured by the project.

Document any check that is unavailable or failing.