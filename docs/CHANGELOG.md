# Changelog

Record meaningful frontend changes here.

## Unreleased

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