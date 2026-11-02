# Architecture and Project Decisions

## DEC-031: Device-First Theme Preference and Pre-React Initialization

Decision:
Store the user's preference as `light`, `dark`, or `device` in localStorage under `everybuy-theme`. Resolve Device against `prefers-color-scheme`, apply the result synchronously in the document head, and use the same resolved value in the runtime `useTheme` store. The existing header toggle selects an explicit opposite theme; Settings provides all three preferences.

Reason:
The existing hook persisted the resolved color, making it impossible to distinguish a Device choice from an explicit Light/Dark selection. It also could not theme the document before stylesheet and React startup.

Consequence:
Device remains the default across reloads and follows OS changes. Browser storage failure falls back to Device for startup; subsequent explicit choices still work for the current tab but cannot persist when storage is unavailable.

Record important decisions here so future sessions do not repeat them.

## DEC-001: Separate Repositories

Decision:
The frontend and backend remain in separate repositories.

Reason:
They can be developed and maintained independently.

Backend:
C:\Users\loixr\projects\everybuy

Frontend:
C:\Users\loixr\projects\everybuy-frontend

The frontend agent may inspect the backend but must not modify it without explicit permission.

## DEC-002: Frontend Stack

Decision:
Use React, TypeScript, Vite, Tailwind CSS, and Bun.

Reason:
This is the selected frontend stack.

Additional dependencies require a clear reason.

## DEC-003: Design Reference

Decision:
Use the supplied Everyday offline design package as the visual specification.

Location:
design/Everyday_Offline_Design/

The current implementation targets the physical inventory application.

The online store remains outside the initial implementation scope.

## DEC-004: Custom Visual Identity

Decision:
Use the supplied Everyday design rather than copying Craftlink's visual style or using a generic dashboard template.

Reason:
Everybuy has its own workflows and visual specification.

## DEC-005: Mobile-First Layout

Decision:
Support mobile, tablet, and desktop layouts.

Follow the supplied design handoff for responsive navigation, page padding, forms, and record layouts.

## DEC-006: Backend Is the Source of Truth

Decision:
Frontend behavior must follow the existing backend contract.

Reason:
The frontend must not invent endpoints, permissions, or business rules.

## DEC-007: Authentication

Decision:
Use the existing Better Auth implementation where supported.

The actual authentication flow must be verified by inspecting the backend before implementation.

Do not assume a separate JWT-based frontend authentication system is required.

## DEC-008: Business Feature Order

Decision:
The initial feature priorities are:

1. Products and stock
2. Sales and payments
3. Purchases and stock receiving

The foundation must be completed before these workflows are implemented.

## DEC-009: Owner and Staff Access

Decision:
The UI must account for Owner and staff permissions.

Actual permissions must be verified from the backend. Do not assume that both roles can perform the same actions.

## DEC-010: API Client and Auth

Decision:
API base URL is configurable via `VITE_API_BASE_URL`. All requests use `credentials: 'include'` for cookie-based Better Auth sessions. Do not store JWTs on the frontend.

Reason:
Matches verified backend (Better Auth with cookies, CORS allowing credentials).

## DEC-011: Stock Mutation Idempotency Keys

Decision:
For `POST /api/v1/stock/additions` and `POST /api/v1/stock/adjustments`, generate the required `requestId` (UUID) on the client with `crypto.randomUUID()` and keep it in a ref across retry attempts. Clear it only after the backend confirms success.

Reason:
The backend treats `requestId` as an idempotency key and replays the original result (`replayed: true`) for retries, preventing duplicate stock changes when a user resubmits after a network error. Regenerating the key on retry would defeat this.

Related:
Stock mutation responses return only `{ id, stockPacks }` per product (`UpdatedProductStock`), not full product objects. Merge the balance into local state; do not replace the product record.

## DEC-012: Money Arithmetic in Integer Kobo

Decision:
Compute money totals on the frontend with integer kobo (`BigInt`) using `toKobo`/`fromKobo` in `src/lib/utils/money.ts`, ported from the backend's `src/common/utils/money.ts`. Never use floating-point math for Naira amounts.

Reason:
The backend stores money as `numeric(14,2)` strings and converts to integer kobo for all arithmetic. Mirroring it keeps client-side previews (line totals, sale totals, balances) identical to server results.

Related:
Sale prices are never sent by the frontend. `POST /api/v1/sales` prices every line from the product row server-side; the client only sends `requestId`, `customerId`, `amountPaid`, and `items`.

## DEC-013: Omit Unpersistable Design Fields

Decision:
When a supplied design includes a field the backend cannot store, omit the field and document the limitation instead of faking it. Applied to the sale screen: no "Payment method" input (the `payments` table has no method column) and no "Sale type" input (cash/credit is derived from `itemsTotal` vs payments).

Reason:
Sending data the backend discards, or persisting it in frontend-only storage, would misrepresent the system's records.

## DEC-014: Cookie-Only Authentication with Route Guards

Decision:
Use the backend's Better Auth cookie session directly. `AuthProvider` reads `GET /api/v1/auth/get-session` on startup, all requests keep `credentials: 'include'`, and no token is written to localStorage or application memory. Protected routes wait for the session check; a 401 from any application endpoint emits `everybuy:unauthorized` and returns the user to `/signin`, remembering the attempted path.

Reason:
The backend (verified in `src/auth.ts` and `@thallesp/nestjs-better-auth`) issues HttpOnly session cookies, requires a trusted `FRONTEND_URL` origin, and already handles sessions, email verification, and two-factor authentication. A separate JWT or token-storage layer would duplicate and weaken that system.

Related:
- Two-factor challenges are completed with `/two-factor/verify-otp` (email code) or `/two-factor/verify-totp` (authenticator app) before a session exists.
- Backup-code login uses `/two-factor/verify-backup-code`; backup codes are shown only immediately after enrollment or regeneration, never read back from profile data.
- Account settings enroll TOTP with `/two-factor/enable`, require `/two-factor/verify-totp` before activation, and require the current password to disable or replace backup codes.
- The session does not include the Owner/Staff role; the UI does not infer it, and backend guards remain authoritative.

## DEC-015: No Per-Customer Statement Fan-Out

Decision:
`GET /api/v1/customers` is loaded once for the directory and never followed by one statement request per customer. The directory shows only backend-supported fields (name, phone, active, timestamps) and links each row to the customer statement, where balance owed and last purchase are shown.

Reason:
The list endpoint has no balance/last-sale aggregates, and the backend's global throttler allows 3 requests/second per route. A statement-per-row fan-out would be throttled and would make the directory slow and unreliable. The detail screen already provides authoritative totals in one statement request.

Consequence:
The supplied directory's "Balance owed" and "Last sale" columns are intentionally absent. Adding them requires a backend aggregate endpoint or an agreed server-side list response.

## DEC-016: Server-Authoritative Repayment Balances

Decision:
Repayment amounts are posted with a client-generated `requestId` that is kept across retries of the same sale/amount and regenerated when either changes. The UI displays the statement totals returned by the backend; the only client-computed figure is a clearly labelled post-repayment preview using integer kobo arithmetic. After a confirmed repayment, the detail page refetches the statement instead of patching balances locally.

Reason:
The backend locks the sale, rejects overpayments and fully paid sales, and treats `requestId` as the idempotency key. Server totals avoid drift and double-counting, and refetching keeps the page consistent with concurrent payments.

Consequence:
The repayment design's "Payment method", "Payment date", "Reference", and at-sale/repayment type are omitted because the `payments` table stores only `amount`, `requestId`, `paidAt`, and `recordedBy`. Customers are deactivated with `active: false` because there is no delete endpoint.

## DEC-017: Reduced Sales List and Detail Statement Reuse

Decision:
The sales list is server-paginated (`page`, `limit=20`) and never requests a statement per row. Customer names come from one customer-list request and are mapped client-side. Search, payment-state filters, Owed/Status columns, and the daily summary cards are omitted because the sales DTO exposes only `page`/`limit` and list rows contain no payment or balance data.

For a single viewed sale, the detail page requests the sale with its item snapshots and, when a customer is attached, one customer statement to obtain that sale's paid amount, balance, status, and payments. A sale without a customer is shown as paid at sale, following the verified backend rule that rejects an unpaid balance without a customer.

Reason:
A statement per list row would exceed the backend's 3 requests/second throttle, and no daily aggregate endpoint exists. One statement per viewed sale is cheap, keeps balances server-authoritative, and supports the repayment action already built for customers. Historical item lines must come from saved sale-item snapshots, not current product rows.

Consequence:
The sales list omits the design's search, "All payment states" filter, Owed/Status columns, and Sales today/Paid today/Balance owed cards. Adding them requires backend query and aggregate support. Payment method and recorded-by names remain unavailable, and sale references use a short UUID prefix because there is no `SL-####` column.

## DEC-018: Reports Use Backend Daily, Monthly, and Profit Aggregates

Decision:
FE-042 is implemented at `/overview` with **Today**, **Monthly**, and **Profit** tabs backed by `GET /api/v1/reports/overview`, `/reports/monthly?month=YYYY-MM`, and `/reports/profit?month=YYYY-MM`. The frontend displays backend aggregates and does not reconstruct official figures from list endpoints.

The daily tab shows today's sales, payments received, current outstanding customer balances, low-stock products, and five recent sales. The monthly tab shows `salesTotal`, `moneyReceived`, `outstandingDebtAtMonthEnd`, product quantities sold (`bagsSold`, `retailPacksSold`, `totalPacksSold`), and month-end `closingStock`. The profit tab shows revenue, COGS, gross profit, expenses, and net profit. Month navigation is validated against the backend pattern, defaults to the current `Africa/Lagos` month, and each change refetches the selected report.

Reason:
The backend provides dedicated daily, monthly, and profit aggregates. Using those endpoints keeps figures authoritative and avoids deriving totals from incomplete sales and customer lists.

Consequence:
Daily `customerBalances` is the current total outstanding across customer sales, not a day-only balance. Monthly money received includes repayments for earlier sales, and month-end debt is cumulative. The profit report returns 409 if any sale item has no saved cost; the frontend preserves that unavailable state instead of showing zero profit.

Closing stock is displayed as a plain month-end pack balance rather than with the live low-stock badge: the 10-pack threshold is a current-inventory heuristic and would mislabel a historical balance. `moneyReceived` intentionally includes payments for earlier sales, and `outstandingDebtAtMonthEnd` is cumulative debt as of month end, so the page explains both instead of implying they are monthly-only figures.

## DEC-019: Settings Page and Permission Handling for Team Access

Decision:
Replace the dead "Team & preferences" link with a real `/settings` page covering profile (read-only), appearance, team management, and session sign-out. `/team` redirects to `/settings`.

Team data comes from one `GET /api/v1/staff` request. Because the session carries no staff role, the page does not guess whether the user is an owner: it performs the request and renders "Owner access required" on 403, an empty state on the backend's 404 "No staff found", and a retry on other failures. The "Add staff" action is only shown once the list load succeeds.

Staff onboarding offers both verified owner paths â€” email invitation (`POST /api/v1/staff/invite`) and direct creation with an initial password (`POST /api/v1/staff`). The public `/accept-invite?token=â€¦` page completes the invitation using the token as the credential.

Reason:
The previous navigation item pointed at a route that did not exist, which made the shell look broken and hid staff onboarding entirely. Showing an owner-only failure state is honest and avoids replicating backend authorization in the client. Supporting both creation paths keeps the feature usable even when invitation email is misconfigured; the backend currently lacks `STAFF_INVITE_PREVIEW_URL`, so invitations answer 500 while password mode works.

Consequence:
The page states that profile editing, password changes, role changes, member deactivation, and pending-invitation management are unavailable. It also discloses that the team list has no emails. Owners still manage authorization on the backend. A richer settings page needs new endpoints (see the changelog/task notes), not client-side role inference.

## DEC-020: Everybuy Branding and Neutral Dark Theme

Decision:
Use **Everybuy** as the product name everywhere in the interface: shell header, sidebar footer, loading screen, sign-in screen, invitation page, document title, favicon, package name, and README. Do not keep the design placeholder name "everyday" or the fictional "Uyo" store location.

The dark theme uses neutral near-black surfaces (`#0A0B0A` canvas, `#121412` surface, `#1A1D1A` subtle, `#262B26` border) rather than the previous green-tinted darks. The brand green remains the accent (`#B7D5A8` with `#10200F` on-accent) so the identity survives without tinting the whole workspace.

Reason:
The design package is a visual reference; its placeholder brand and city were not the product's. Green-tinted dark surfaces reduced contrast between the canvas and surfaces and made the workspace feel like a themed demo. Neutral near-black surfaces keep hierarchy while staying comfortable for long shop sessions.

Consequence:
Light-mode tokens are unchanged. Dark mode now depends on borders and surface layering for separation, which the cursor/focus rules and existing border tokens already provide. Any future store name/location must come from a backend settings endpoint rather than hard-coded copy.

## DEC-021: Bun's Built-in Test Runner

Decision:
Add automated unit tests with Bun's built-in runner (`bun test`) instead of installing Vitest or Jest. Test pure logic (money, formatting, API client behaviour) under `src/**/*.test.ts`, add `@types/bun`, and list `"bun"` in `tsconfig.app.json` types so tests are type-checked with the app.

Reason:
Bun is already the package manager and runtime for this project, so the runner adds no new framework or config. The highest-risk frontend logic is money/time formatting and API error handling, which are pure and stable to test. Component tests would require a DOM library and a broader testing setup that is not justified by the current requirements.

Consequence:
`bun test` is part of the check suite alongside `tsc`, `oxlint`, and the production build. UI behaviour is still verified manually against the running backend; adding component tests later means introducing a DOM test library deliberately.

## DEC-022: Packs and Bags Are the Only Units

Decision:
Use **packs** and **bags** everywhere in the interface. The bulk unit is always called a bag, never a carton. That covers product setup ("Packs per bag", "Bag price", "Bags & selling prices"), product detail ("Bag conversion"), receive stock ("Sealed bags"), sale recording ("Sell packs or bags", the "Bag" add button), sale detail unit labels, and the monthly report ("Bags" column).

Reason:
The backend enum is `Unit.BAG = 'Bag'` / `Unit.PACK = 'Pack'` and the product fields are already `packsPerBag` and `bagPrice`. Only the frontend copy said "carton", inherited from the design package, so the same quantity was described two different ways depending on the screen. Packs and bags are also how shop staff describe stock.

Consequence:
There is no third unit, and no conversion rule beyond the product's `packsPerBag` (applied server-side when a Bag line is sold or a Bag receipt is recorded). Any future design copy that says "carton" should be translated to "bag" rather than reintroducing the term.

## DEC-023: Five-Tab Mobile Navigation with a "More" Sheet

Decision:
Below `lg`, the shell exposes five bottom tabs â€” Stock (`/inventory`), Sale (`/sales`), Customers, Reports (`/overview`) and More â€” and puts Expenses, Audit, Stock movements, Settings and Sign out in a "More" bottom sheet. The desktop sidebar exposes the eight application sections and becomes sticky under the header. Safe-area insets, 44 px touch targets and `100dvh` are part of the shell contract.

Reason:
The previous four-tab bar left Overview and Movements with no mobile entry point at all: both were only reachable from the desktop sidebar, so those screens were effectively desktop-only. Six tabs would have produced labels too narrow to read and targets below the 44 px minimum. A five-tab bar plus a sheet keeps every destination reachable, matches the platform pattern staff already know, and leaves room for a signed-in identity and sign-out that the bar cannot hold.

Consequence:
- The mobile bar is the canonical mobile navigation; pages must not add their own bottom navigation.
- The More sheet is a modal: it must keep dialog semantics, focus handling, scroll locking and safe-area padding if it grows more rows.
- New top-level sections either replace a tab or join the sheet; the bar stays at five items.
- Desktop behaviour is unchanged apart from the sticky sidebar and the sticky header offset, so screenshots in the design handoff still describe the large layout.
- Responsive verification is manual: there is no device/emulator automation in the project, so safe-area rendering on real iOS hardware remains a manual check.

## DEC-024: Poppins Primary Typeface and Mobile Touch Sizing

Decision:
Use bundled Poppins as the primary application typeface, retaining Inter as the fallback. Bundle the Regular, SemiBold, and Bold font files with the SIL Open Font License. On small screens, keep enabled buttons at least 44 px tall, allow long table/code values to wrap, and prevent page-level horizontal overflow while preserving inner scrollers.

Reason:
The user requested Poppins and stronger mobile responsiveness. Locally bundled fonts avoid a runtime network dependency, and larger touch targets improve use on phones.

Consequence:
The original handoff's Manrope typography is superseded by this explicit project instruction. Safe-area and small-device visual behavior still needs a manual real-device pass.

## DEC-025: Keep the Internal Application Out of Search Indexes

Decision:
Treat Everybuy as a private authenticated application. Serve `noindex` metadata on all routes, allow crawlers to read the directive, and do not publish a sitemap. Use descriptive browser titles for navigation, and add public search landing pages separately if needed later.

Reason:
Inventory, customer, sales, and staff pages are not public content. Search snippets or indexed URLs would not help intended users and could expose private route structure.

Consequence:
Search visibility is intentionally disabled for the application. The current CI/CD pipeline targets optional GitHub Pages deployment, gated by production API/base-path variables and backend origin configuration; it is not enabled in this checkout.

## DEC-026: Read-First Settings and On-Demand Management Controls

Decision:
Show saved profile and shop information by default. Reveal their forms only after an explicit Edit action. Keep two-factor setup and maintenance forms, and per-member staff controls, hidden until the user chooses the relevant action.

Reason:
Settings are mainly used to check current values. Showing every editing control continuously makes the page longer and makes routine review feel like data entry.

Consequence:
Forms for dedicated create/edit workflows remain directly visible on their own routes or open after an explicit create action. This is a presentation change only; API contracts, validation and permission checks remain unchanged.

## DEC-027: Use the Backend's Singular Invitation Routes and Its Fixed Staff Role

Decision:
Integrate the invitation flow with the routes the backend actually mounts: `POST /api/v1/staff/invite`, `GET /api/v1/staff/invite/preview?token=…`, and `POST /api/v1/staff/invite/accept`. Do not use the plural `/api/v1/staff/invitations/preview` and `/api/v1/staff/invitations/accept` paths from the earlier task text, and do not offer a role selector in the invitation form. Invitations always create a `Staff` account, and the form says so.

Reason:
`staff.controller.ts` and `public-staff-invitation.controller.ts` mount only the singular paths, and the backend's own `STAFF_INVITE_PREVIEW_URL` points at `http://localhost:5173/invite/accept`. Calling the plural paths would 404. `CreateInviteDto` accepts only `{ name, email }`, and the service writes `role: 'Staff'` unconditionally, so a role control in the invite dialog would be a promise the backend cannot keep. A role can only be changed after acceptance through the verified `PATCH /api/v1/staff/:staffId`.

Consequence:
- The frontend must be updated if the backend ever renames these routes; nothing should be written against the plural path.
- The owner invitation form sends exactly `{ name, email }` and states that the role is Staff, with the role change available on the team list afterwards.
- The emailed link must target `/invite/accept`; `/accept-invite` is kept only as a redirect that preserves the query string for older links.
- `GET /api/v1/staff/invitations` returns the whole invitation table, including rows that were already accepted, so the settings screen shows only invitations that are still waiting to be accepted.

## DEC-028: Treat Any Unavailable Invitation Token as One State

Decision:
Render a single "this invitation is no longer available" state for a 400 from the invitation preview or accept endpoints, plus distinct states for a missing token, rate limiting, server errors, and network failures. State the password rule locally, strip the token from the URL after acceptance, and never sign the invitee in automatically.

Reason:
The backend answers 400 for invalid, expired, already-accepted, and revoked tokens with no distinguishing code or message; accepted and revoked invitations also leave no usable pending row. Claiming to know which case applies would be invented information. Separately, acceptance returns a staff row but no session cookie, so an automatic redirect to the dashboard would only bounce the user back to sign-in.

Consequence:
- The public page explains how to get a new invitation instead of guessing why the old one failed.
- The token lives only in component state; it is not written to storage, logged, or sent anywhere except the two invitation endpoints, and after a confirmed acceptance the URL is replaced with `/invite/accept` so it is no longer in the address bar or history.
- The invitee signs in afterwards with the created email and password; the success screen links to `/signin`.
- If the backend later returns reason-specific status codes, the copy can be split per reason without changing the route or the flow.

## DEC-029: "Pending Invitations" Shows Only Invitations Awaiting Acceptance

Decision:
Filter the owner's pending-invitation list to invitations whose derived status is `pending` or `processing`. Do not render accepted rows there, and do not render expired ones either. When nothing qualifies, show "No pending invitations."

Reason:
The backend keeps accepted invitation rows in the table, so an unfiltered list showed an already-joined person's invitation labelled "Accepted" underneath a heading that says the invitations are pending. That is contradictory and makes the section look stale. There is no declined state in the backend enum, so the only non-pending states are accepted and expired, neither of which is waiting for anyone.

Consequence:
- A just-accepted invitation disappears from the list as soon as the team data is refreshed; the new member is already visible in the team table, which is the meaningful confirmation.
- An expired invitation also disappears, so the owner re-invites from the Add staff dialog instead of revoking a dead link. The design has no invitation history view, and the backend exposes none.
- `isPendingInvitation` in `src/lib/invitations.ts` owns the rule and `TeamSection` applies it, so the filter is testable without a DOM.

## DEC-030: Owner-Only Security Page, Better Auth Passkey Client, and No Secret Persistence

Decision:
Put passkey and authenticator-app management on an `OwnerRoute`-protected `/settings/security` page, link it from an owner-only card on `/settings`, and keep staff out with a redirect and notice as well as the backend hook. Run passkey registration, listing, rename, delete, and sign-in through the official Better Auth browser client (`better-auth/react` plus `passkeyClient` at `basePath: '/api/v1/auth'`). Keep all other requests on the existing `apiFetch`. Never persist tokens, challenges, setup keys, QR contents, backup codes, or passkey credential payloads in browser storage, logs, or analytics.

Reason:
The backend restricts passkey and 2FA management to active owners in `ownerAuthenticationHook`, and passkey sign-in checks ownership again in `afterVerification`. Hiding buttons would not be enough: staff could still open the URL, and the backend must remain the security boundary. WebAuthn requires a browser-side ceremony with a challenge cookie, which the generic fetch wrapper does not implement; the official Better Auth client already handles registration/authentication options, base64url conversion, and error shapes. Secrets are one-time or session-scoped, so writing them anywhere durable would widen exposure for no product benefit.

Consequence:
- `roleResolved` in the auth context lets `OwnerRoute` wait for `/api/v1/me` before deciding, avoiding a premature redirect while the role is unknown.
- A staff member who opens `/settings/security` lands on `/settings` with "Security settings require owner access."; a 401/403 from the backend still ends the session or shows the permission failure.
- `authClient` is imported only by `src/lib/api/passkeys.ts` and is dynamically imported by `AuthProvider.signInWithPasskey`, keeping the WebAuthn client out of the initial bundle.
- Passkey sign-in adopts `{ session, user }`, refreshes the role, and does not run the TOTP/OTP challenge. Password sign-in keeps the existing challenge flow.
- TOTP setup keys and backup codes live only in component state for the current render/session; leaving the page or completing enrollment clears them. Backup codes are shown once after activation or regeneration and cannot be re-read because the backend exposes no browser endpoint for them.
- Passkey names are owner-chosen and validated locally; the frontend shows device type and backup status only when Better Auth supplies them.

