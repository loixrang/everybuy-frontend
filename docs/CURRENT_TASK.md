# Current Task

## Shared word-order-insensitive search and bottom-sheet dropdowns

Status: COMPLETED — typecheck, lint, 126 tests, and the production build pass. Browser/device automation is unavailable in this environment, so 360 px and dark-mode rendering were checked by code review against the theme tokens.

Part 1 adds `matchesSearch` in `src/lib/utils/search.ts`: every whitespace-separated query word must appear anywhere in the text, in any order, case-insensitively and accent-insensitively. An empty query matches everything. Every client-side text filter uses it, including Sale product search, Stock, Customers, expenses, audit, and the customer picker. The Sales page's server-side `q` search is unchanged.

Part 2 adds a shared `BottomSheet` primitive and a controlled `SheetSelect` built on it. All 14 native `<select>` elements found in the audit were replaced without changing stored values, field names, or submission payloads. Long lists get search; short lists do not. The Sale customer picker was refactored onto the same primitive while keeping its Full payment/Customer toggle, avatars, balances, search, and New customer action.

## Acrylic glass overlays (2026-11-05)

Status: COMPLETED — typecheck, lint, and diff check pass.

The overlay inventory uses shared `glass-panel` and `glass-backdrop` classes. Sheets, picker/select sheets, confirm dialogs, and feature dialogs use the panel/backdrop rules. No standalone toast, tooltip, dropdown menu, or popover implementation was found. The persistent mobile tab bar and sticky top header overlay scrolling content and retain their existing independent treatment pending user preference.
