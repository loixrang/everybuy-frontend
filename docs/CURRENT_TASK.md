# Current Task

## Shared word-order-insensitive search and bottom-sheet dropdowns

Status: COMPLETED — typecheck, lint, 126 tests, and the production build pass. Browser/device automation is unavailable in this environment, so 360 px and dark-mode rendering were checked by code review against the theme tokens.

Part 1 adds `matchesSearch` in `src/lib/utils/search.ts`: every whitespace-separated query word must appear anywhere in the text, in any order, case-insensitively and accent-insensitively. An empty query matches everything. Every client-side text filter uses it, including Sale product search, Stock, Customers, expenses, audit, and the customer picker. The Sales page's server-side `q` search is unchanged.

Part 2 adds a shared `BottomSheet` primitive and a controlled `SheetSelect` built on it. All 14 native `<select>` elements found in the audit were replaced without changing stored values, field names, or submission payloads. Long lists get search; short lists do not. The Sale customer picker was refactored onto the same primitive while keeping its Full payment/Customer toggle, avatars, balances, search, and New customer action.

## Acrylic glass overlays (2026-11-05)

Status: COMPLETED — typecheck, lint, and diff check pass.

Shared tokens now set large panels to 92% surface opacity with 24px blur and compact floating panels to 95% opacity with 16px blur. Backdrops use a 30% black tint with 6px blur. Unsupported backdrop filters and reduced transparency use solid surfaces and a 60% dim. Existing modal and sheet behavior/layout is unchanged.

### Overlay audit

| Overlay | File / component | Glass |
| --- | --- | --- |
| Shared picker and select sheets | `src/components/ui/BottomSheet.tsx` (`BottomSheet`), used by `src/components/customers/CustomerPickerSheet.tsx` (`CustomerPickerSheet`) and `src/components/ui/SheetSelect.tsx` (`SheetSelect`) | Applied via shared panel/backdrop classes |
| More navigation sheet | `src/components/layout/InventoryLayout.tsx` (`MoreSheet`) | Applied |
| Confirmation dialogs | `src/components/ui/ConfirmDialog.tsx` (`ConfirmDialog`), used by `src/pages/stocktakes/StockTakeDetailPage.tsx`, `src/pages/settings/CatalogManagementPage.tsx`, `src/pages/settings/SupplierManagementPage.tsx`, `src/components/settings/TwoFactorSettings.tsx`, and `src/components/settings/PasskeySettings.tsx` | Applied |
| Count stock modal | `src/components/stocktakes/CountStockModal.tsx` (`CountStockModal`) | Applied |
| Start stocktake modal | `src/components/stocktakes/StartStocktakeModal.tsx` (`StartStocktakeModal`) | Applied |
| Add customer modal | `src/components/customers/AddCustomerModal.tsx` (`AddCustomerModal`) | Applied |
| Record repayment modal | `src/components/customers/RecordRepaymentModal.tsx` (`RecordRepaymentModal`) | Applied |
| Record expense modal | `src/components/expenses/RecordExpenseModal.tsx` (`RecordExpenseModal`) | Applied |
| Stock adjustment modal | `src/components/stock/StockAdjustmentModal.tsx` (`StockAdjustmentModal`) | Applied |
| Staff account modal | `src/components/settings/StaffAccountModal.tsx` (`StaffAccountModal`) | Applied |
| Supplier dialog | `src/pages/settings/SupplierManagementPage.tsx` (`SupplierDialog`) | Applied |
| Historical cost repair dialog | `src/pages/sales/SaleDetailPage.tsx` (`SaleDetailPage` repair dialog) | Applied |
| Sign-in theme toggle | `src/components/auth/AuthShell.tsx` and `src/pages/auth/SignInPage.tsx` | Compact panel applied |

No separate tooltip, toast, popover, or dropdown-menu surface exists in the frontend. Search icons positioned inside inputs and inline selects are not floating overlays. The persistent mobile tab bar and sticky top header sit over scrolling content and are intentionally left unchanged for the user's decision.
