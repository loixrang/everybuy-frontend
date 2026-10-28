# Changelog

Record meaningful frontend changes here.

## Unreleased

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
  - Cartons + loose packs entry combined into a single pack-denominated receipt.
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
  - Available stock metric card with carton/loose pack conversion.
  - Pack and carton price cards formatted in Nigerian Naira.
  - Product setup summary: brand, category, base unit, carton conversion, pieces per pack, active status.
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