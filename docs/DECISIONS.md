# Architecture and Project Decisions

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
