# Current Task

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
