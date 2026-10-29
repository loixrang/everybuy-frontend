# Current Task

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

Implement the sale recording flow according to the verified backend contract: multi-item cart with pack/carton units, customer selection, amount paid with balance rules, idempotent submission, and conflict handling.

## Scope

- Inspect sale creation rules (`POST /api/v1/sales`, guarded by `StaffGuard`).
- Support the actual product units (`Pack` / `Carton`) and quantities.
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
  - Client-side product search with Pack/Carton add buttons; adding the same product+unit increases quantity (backend rejects duplicate product+unit lines).
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
  - Cartons + loose packs entry combined into a single pack-denominated receipt.
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
  - Summary metrics: available stock (with cartons/packs breakdown), pack price, carton price.
  - Product setup card: brand, category, base unit, carton conversion, pieces per pack, active status.
  - Action buttons: "Edit product", "Receive stock", "View movements".
  - Loading, 404 not found, and error states with retry.
- `ProductSetupPage` (`/inventory/new` and `/inventory/:id/edit`):
  - Form fields matching backend schema: name, brand, category, pack type, size, pieces per pack, packs per carton, retail pack price, carton bag price, active status.
  - Form validation: positive integers for quantities, positive prices, required brand/category.
  - Authorization feedback: clear messaging when mutations are rejected by `OwnerGuard` (403 Forbidden).
  - Clean cancel and save actions with submit loading indicators.
- Registered `/inventory/new`, `/inventory/:id`, and `/inventory/:id/edit` routes in `AppRouter`.

### Checks:
- `bun run build`: passed
- `bunx tsc -b --noEmit`: passed
- `bun run lint`: passed (oxlint, 0 warnings, 0 errors)
