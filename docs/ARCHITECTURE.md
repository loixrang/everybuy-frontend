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
    sales/
      RecordSalePage.tsx
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