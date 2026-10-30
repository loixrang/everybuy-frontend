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
    settings/
      StaffAccountModal.tsx
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
      staff.ts
      stock.ts
    hooks/
      useTheme.ts
    utils/
      format.ts
      money.ts
  pages/
    auth/
      AcceptInvitePage.tsx
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
    settings/
      SettingsPage.tsx
    stock/
      ReceiveStockPage.tsx
      StockMovementsPage.tsx
  styles/
    index.css
    tokens.css
    Fonts/
      Poppins-Regular.ttf
      Poppins-SemiBold.ttf
      Poppins-Bold.ttf
      Inter.ttf
      Manrope.ttf
  types/
    auth.ts
    customer.ts
    product.ts
    report.ts
    sale.ts
    staff.ts
    stock.ts
  main.tsx
  App.tsx
.github/
  workflows/
    ci-cd.yml
```


## Responsibilities

### App

Application entry point, global providers, and route configuration.

### Components

Reusable UI components that are not tied to one business feature.

### Features

Components, hooks, types, and API functions related to a particular feature.

### Layouts

Shared page structures, including the authenticated inventory layout. The desktop sidebar, the mobile tab bar and the More sheet all live in `InventoryLayout` (FE-053).

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
- A Better Auth `twoFactorRedirect` is treated as a pending challenge, not an authenticated session. Sign-in supports authenticator TOTP, requested email OTP, and single-use recovery codes; the provider establishes local auth state only after a verification endpoint returns the verified user/session response.
- `TwoFactorSettings` starts password-confirmed TOTP enrollment, shows the returned setup URI and one-time recovery codes, verifies a current authenticator code before activation, and supports password-confirmed disable and recovery-code replacement. It re-reads the Better Auth session after changes.
- The shared API client checks OTP request and 2FA mutation responses before displaying success. Email OTP UI says the request was accepted, because Better Auth 1.7.10 can return `{ status: true }` even when its provider callback failed.
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

- `OverviewPage` (`/overview`) has Today, Monthly, and Profit tabs backed by `GET /api/v1/reports/overview`, `/api/v1/reports/monthly?month=YYYY-MM`, and `/api/v1/reports/profit?month=YYYY-MM`. All are StaffGuard routes, and the frontend renders backend aggregates rather than rebuilding official totals.
- The daily tab shows today's sales and payments, current outstanding customer balances, products at or below 10 packs, and the five most recent sales. The balance is cumulative across customer sales, not today's-only debt.
- The profit tab displays revenue, cost of goods sold, gross profit, expenses, and net profit. The backend returns 409 when any sale in the selected month has missing saved cost data; the UI reports that state instead of treating missing cost as zero.
- The Monthly tab requests one Africa/Lagos calendar month and renders the backend's numbers; it never recomputes totals from other endpoints.
- The initial month comes from `currentLagosMonth()` (an `Intl` lookup forced to `Africa/Lagos`), so the browser's local timezone cannot select the wrong month. Previous/Next controls use `shiftMonth`, the `type="month"` input is validated against the backend pattern (including the `0000` rejection), and a "This month" shortcut appears when browsing history.
- Summary cards show `salesTotal`, `moneyReceived`, `outstandingDebtAtMonthEnd`, and the number of product lines in `productsSold`.
- `productsSold` renders as a table (desktop) and cards (mobile) with bags, packs, and total packs. `closingStock` renders as a pack balance list with a link to inventory.
- Closing stock is labelled as a month-end balance and does not reuse the live stock badge: the 10-pack low-stock threshold is a current-inventory heuristic and would mislabel a historical balance.
- Loading skeleton, empty month, 401/403, validation/network error, and retry states are handled. Month changes refetch; stale responses are discarded with an `ignore` flag.
- `moneyReceived` includes payments for earlier sales and outstanding debt at month-end is cumulative. See `DECISIONS.md`.

## Expenses, Audit, and Shop Settings

Implemented (FE-054):

- `ExpensesPage` loads the StaffGuard expense list once and filters it locally. `RecordExpenseModal` validates the backend fields and submits a UUID `requestId`; it preserves the same key for retries of an unchanged payload and does not retry automatically.
- `AuditPage` reads the StaffGuard audit list, filters it locally, and clearly states that expense creation is currently the only audited operation. The backend list is unpaginated.
- `ShopSettingsSection` reads the settings row for staff. Owner-only saves use the row id and the verified PATCH route; a missing row is shown as unavailable because the backend has no create endpoint.
- Backend routes, DTOs, response shapes, and guard behavior are recorded in `docs/API_CONTRACT.md`.

## Settings and Team Access

Implemented (FE-050):

- `SettingsPage` (`/settings`) is reachable from the sidebar ("Settings") and the mobile "More" tab; `/team` redirects there so older links keep working.
- The profile card is read-only and comes from the Better Auth session (`name`, `email`, `emailVerified`, `createdAt`, `twoFactorEnabled`); the page states that profile editing is not available.
- The Two-factor authentication section reflects `twoFactorEnabled` from that session and exposes TOTP enrollment, disable, and recovery-code regeneration. No current backup codes are retrieved from profile/session APIs.
- The appearance card drives the shared theme store; the choice is stored in `localStorage` and applied to `<html data-theme>`.
- The team card requests `GET /api/v1/staff` once. A 403 renders "Owner access required", a 404 renders an empty team, and other failures show the message with a retry. No per-member requests are made.
- `StaffAccountModal` supports the two verified owner paths: email invitation and direct account creation with an initial password. Client validation mirrors the backend (email shape, 12–128 character password, confirmation), and 409/500/503 responses produce actionable hints instead of raw errors.
- `AcceptInvitePage` (`/accept-invite?token=…`) is public and rendered outside the auth guards. It previews the token, shows the invited name/email/expiry, and submits the password to `POST /api/v1/staff/invite/accept`.
- The page never derives the user's role from the session: staff have no role claim, so owner-only data is requested and permission failures are handled explicitly. See `DECISIONS.md`.

## Navigation and Mobile Layout

Implemented (FE-053):

- `InventoryLayout` is the only authenticated shell. It owns the sticky header, the desktop sidebar and, below `lg`, the fixed five-tab bar: **Stock** (`/inventory`), **Sale** (`/sales`), **Customers**, **Reports** (`/overview`) and **More**.
- Destinations that do not fit in the bar (Expenses, Audit, Stock movements, Settings, Sign out) live in `MoreSheet`, a bottom sheet rendered inside the layout. It is a modal dialog: `role="dialog"`, `aria-modal`, labelled title, initial focus, a Tab cycle, Escape/backdrop/link dismissal, focus return to the More tab, body scroll lock, dismissal on `popstate`, and automatic close when the viewport reaches `lg`.
- Active state is derived from `location.pathname` and exposed with `aria-current="page"`; the More tab also exposes `aria-expanded` and `aria-haspopup="dialog"`.
- Every route change scrolls the document to the top, because the app renders full-page sections rather than an inner scroll container.
- Safe areas are handled with `env(safe-area-inset-*)`: top padding on the header and the auth screens' floating toggle, bottom padding on the tab bar, sheets and dialogs, and a matching spacer so content is never hidden behind the bar. `index.html` sets `viewport-fit=cover` and a dark `theme-color` variant.
- The shell is `min-h-dvh`, and the desktop sidebar is `sticky` underneath the header with its own height and scroll, so navigation stays available while long lists scroll.
- Touch targets are 44 px on phones (header controls, tab bar, steppers, remove actions). Dialogs switch to bottom sheets below `sm`.
- Dense lists provide a mobile equivalent rather than a squeezed table: inventory, sales, customers, reports, settings and product movements use cards on phones; the movements ledger table starts at `md` and scrolls horizontally.
- `src/styles/index.css` owns the small-screen rules: pinned `text-size-adjust`, `.no-scrollbar` for horizontally scrolling filter chips, `.pb-safe`, and a 16 px minimum font size for text controls below `sm` (prevents iOS focus zoom).
- Poppins is the primary bundled font. On phones, buttons have a 44 px minimum touch height, long table/code values can wrap, and page-level horizontal overflow is clipped while intentional inner scrollers remain available.
- The navigation model is a frontend decision because the backend exposes no per-role navigation data. See `DECISIONS.md` DEC-023.

## Theme and Interactions

Implemented (FE-051):

- `useTheme` is a module-level external store consumed through `useSyncExternalStore`. Every mounted consumer (header, sign-in, settings, invite page) sees the same value, and the stored theme is applied before the first render.
- Light and dark palettes live in `src/styles/tokens.css`. The dark palette uses neutral near-black surfaces; the brand green is reserved for the accent, so the workspace does not look green-tinted.
- `src/styles/index.css` adds global pointer affordances: `cursor: pointer` for links, enabled buttons, `role="button" | "link" | "tab"`, summaries, labels, selects and checkable inputs; `not-allowed` for disabled controls and `aria-disabled`; `progress` for `aria-busy` regions. Tailwind v4's preflight leaves buttons with the default cursor, which is why this is explicit.
- Branding is **Everybuy** throughout: shell header, sidebar footer, loading/sign-in/invite screens, document title, favicon, package name and README. The fictional "Uyo" store line was removed because the backend stores no store location.

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

Implemented (FE-051):

- Tests use Bun's built-in runner (`bun test`), so no extra test framework is installed.
- `src/lib/utils/money.test.ts` covers kobo conversion, negatives, malformed input, and round-trips.
- `src/lib/utils/format.test.ts` covers Naira formatting, stock thresholds, date helpers, Lagos month boundaries, month shifting/labelling, and movement labels.
- `src/lib/api/client.test.ts` stubs `fetch` to verify JSON parsing, cookie credentials, JSON content type, `ApiError` messages, and the unauthorized-event behaviour (including the auth-endpoint exception).
- `@types/bun` is a dev dependency and `tsconfig.app.json` lists `"types": ["vite/client", "bun"]`, so tests are type-checked with the app.
- Component and browser tests are not set up; adding them requires a DOM test library and a deliberate dependency decision.

## Production Build and Search Visibility

Implemented (FE-055):

- Page modules are loaded with `React.lazy` and a shared accessible `Suspense` fallback, so the initial JavaScript does not include every feature screen.
- `VITE_BASE_PATH` configures Vite's asset base for deployments; `BrowserRouter` uses Vite's `BASE_URL` so routes work beneath a project subpath.
- The private application sets `noindex` metadata and a browser title per route. `robots.txt` allows crawlers to read the noindex directive; no sitemap is published.
- `.github/workflows/ci-cd.yml` checks type, lint, tests and build on PRs and pushes, then optionally deploys the verified artifact to GitHub Pages when the production API URL and base path variables are configured.
- Deployment setup and backend-origin requirements are in `docs/DEPLOYMENT.md`.
