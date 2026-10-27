# Current Task

## FE-012: Inventory and Stock Movements

Status: READY

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
