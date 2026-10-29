# API Contract

This document records the frontend's verified integration with the Everybuy backend.

Backend location:
C:\Users\loixr\projects\everybuy

The backend is the source of truth. Do not invent endpoints or response structures.

## Verification Status

All details below have been verified against the current backend (dist/ and source inspection).

## General Configuration

| Item | Verified Value |
|---|---|
| API base URL | Configurable via VITE_API_BASE_URL (default suggested: http://localhost:3000) |
| API route prefix | /api/v1 (from Nest app.setGlobalPrefix('api/v1')) |
| Authentication base path | /api/v1/auth (Better Auth via @thallesp/nestjs-better-auth; basePath set in createAuth) |
| Frontend origin | FRONTEND_URL from backend env (e.g. http://localhost:5173); CORS allows credentials from that origin |
| Credential and cookie requirements | Cookies/sessions (Better Auth). CORS with credentials: true. Frontend must send credentials (cookies). Do not manually store JWTs. |
| Error response format | Nest standard - uses global ValidationPipe (whitelist, forbidNonWhitelisted, transform) and StandardSchemaValidationPipe. Specific shapes vary by module; treat as unstructured by default but validated. |

## Authentication (Better Auth)

Verified from backend (dist/auth.js):

- Library: better-auth with drizzleAdapter (pg), @thallesp/nestjs-better-auth integration
- basePath: `/api/v1/auth`
- appName: `Everybuy`
- secret: `BETTER_AUTH_SECRET` (env)
- baseURL: `BETTER_AUTH_URL` (env)
- trustedOrigins: `[process.env.FRONTEND_URL ?? 'http://localhost:5173']`
- emailAndPassword: enabled, `disableSignUp` depends on options (provisioning can allow; normal auth via createAuth passes options.allowSignUp false by default), minPasswordLength 12, maxPasswordLength 128, autoSignIn false, requireEmailVerification true
- emailVerification: sendVerificationEmail implemented (custom email via sendEmail); in production throws if not configured
- session: expiresIn 7 days (60*60*24*7), updateAge 1 day
- plugins: twoFactorPlugin (issuer 'Everybuy', OTP period 3 min)
- rate limiting enabled (window 60s, max 100)
- cookies/sessions managed by Better Auth; frontend must use credentials: 'include' for requests and follow Better Auth client patterns

Notes:
- Sign-up may be disabled by default in normal auth; staff provisioning uses `createProvisioningAuth` with allowSignUp true.
- Do not assume JWT storage on frontend; rely on session cookies.

## Authentication Contract Notes (verified)

Verified from `src/auth.ts`, `src/app.module.ts`, and the installed `better-auth` 1.7.x distribution:

- **Cookie sessions only**: the frontend must send `credentials: 'include'`. No JWT is issued or stored; the session cookie is managed by Better Auth.
- **Session read**: `GET /api/v1/auth/get-session` returns `{ session, user }` for a valid cookie and JSON `null` when signed out (not 401).
- **Sign-in**: `POST /api/v1/auth/sign-in/email` with `{ email, password }`. Success returns `{ token, user, redirect, url }` plus the session cookie. If the account has two-factor enabled the response is `{ twoFactorRedirect: true, twoFactorMethods }` and **no session cookie** is issued yet.
- **Email verification required**: `requireEmailVerification: true`; unverified accounts are rejected with 403 `EMAIL_NOT_VERIFIED`.
- **Origin check**: sign-in validates the browser `Origin` against `trustedOrigins` (`FRONTEND_URL`, default `http://localhost:5173`). A mismatch returns 403 `INVALID_ORIGIN`. The frontend origin must match `FRONTEND_URL` exactly.
- **Two-factor**: plugin issues a short-lived signed challenge cookie (10 min). A code can be sent by email (`/two-factor/send-otp`; OTP period is 3 minutes, 6 digits) or verified from an authenticator app (`/two-factor/verify-totp`). Both verification endpoints return `{ token, user }` and set the session cookie. Backup-code verification exists in the plugin but is not exposed by the current UI.
- **Sign-out**: `POST /api/v1/auth/sign-out` revokes the session and clears the cookie; returns `{ success: true }`.
- **Error shape**: Better Auth errors are JSON `{ message, code }` (for example `INVALID_EMAIL_OR_PASSWORD`, `EMAIL_NOT_VERIFIED`, `INVALID_ORIGIN`, `INVALID_CODE`, `OTP_HAS_EXPIRED`, `TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE`).
- **Rate limits**: Better Auth's own limiter is 100 requests / 60 s; the two-factor plugin adds 3 requests / 10 s. The Nest app also installs a global `ThrottlerGuard` with **3 requests / second and 100 / minute**, keyed per controller + handler. Do not fan out per-record requests (e.g. one statement call per customer); they will be throttled.
- **No role in the session**: Better Auth's `user` object has no Owner/Staff role. The role lives in the separate `staff` table, so the frontend cannot derive it from the session. Role-based actions remain backend-enforced.
- **Sign-up**: the mounted auth instance is created with `allowSignUp: false`; there is no public sign-up flow.

## Roles and Permissions

Verified from schema (dist/database/schema/auth.schema.js):

- Roles enum: `Owner`, `Staff` (pgEnum staff_role)
- `staff` table: `userId` (unique FK to user), `role` (default Staff), `active` (default true), `createdBy`, timestamps
- Some routes guarded by `OwnerGuard` (e.g. Products create/update use `@UseGuards(OwnerGuard)`). 
- Other routes may rely on different guards/authorization patterns via Better Auth/Nest guards.

| Action | Owner | Staff | Verification |
|---|---|---|---|
| View products | Allowed | Allowed (StaffGuard on ProductsController requires staff/owner active session) | Verified from ProductsController |
| Create products | Guarded by OwnerGuard (POST /api/v1/products) | Forbidden by OwnerGuard | Verified from controller |
| Update products | Guarded by OwnerGuard (PATCH /api/v1/products/:id) | Forbidden by OwnerGuard | Verified from controller |
| View categories | Allowed | Allowed (StaffGuard on CategoriesController) | Verified from CategoriesController |
| View brands | Allowed | Allowed (StaffGuard on BrandController) | Verified from BrandController |
| Record sales | Allowed (StaffGuard on SalesController) | Allowed (StaffGuard) | Verified from SalesController |
| Record payments/repayments | Allowed (StaffGuard) | Allowed (StaffGuard) | Verified from CustomersController |
| Manage customers | Allowed (StaffGuard) | Allowed (StaffGuard) | Verified from CustomersController (create/list/read/update) |
| Receive stock (additions) | Allowed (StaffGuard on StockController) | Allowed (StaffGuard) | Verified from StockController |
| Adjust stock | Allowed (OwnerGuard on POST /api/v1/stock/adjustments) | Forbidden by OwnerGuard | Verified from StockController |
| View stock movements | Allowed | Allowed (StaffGuard) | Verified from StockController |
| Manage suppliers | Allowed (OwnerGuard on POST /add and PATCH /update/:id; StaffGuard on reads) | Read-only | Verified from SuppliersController |
| Approve stocktakes | Unverified (stated in design Owner only) | Unverified | Pending - enforce server-side |
| Manage staff | Unverified (staff module exists) | Unverified | Pending |

Do not treat as full policy - verify per endpoint.

## Endpoint Inventory (verified where found)

| Feature | Method and Path | Request | Response | Access | Status |
|---|---|---|---|---|---|
| Auth (Better Auth) | Mounted at /api/v1/auth/* (Better Auth handlers) | Better Auth API shapes (see better-auth docs) | Better Auth responses | Varies | Verified (mounted) |
| Session | GET/POST /api/v1/auth/get-session | None (session cookie) | `{ session, user }` or JSON `null` when signed out | Public | Verified (better-auth 1.7.x + backend source) |
| Sign in | POST /api/v1/auth/sign-in/email | `{ email, password }` | `{ token, user }` on success; `{ twoFactorRedirect: true, twoFactorMethods: ('totp' \| 'otp')[] }` when 2FA is enabled | Public | Verified (better-auth 1.7.x) |
| Sign out | POST /api/v1/auth/sign-out | `{}` (body optional) | `{ success: true }` and cookie cleared | Session cookie | Verified (better-auth 1.7.x) |
| Send 2FA code | POST /api/v1/auth/two-factor/send-otp | `{}` (optional `trustDevice`) | `{ status: true }`; requires the signed 2FA challenge cookie | Pending 2FA | Verified (better-auth 1.7.x) |
| Verify emailed 2FA code | POST /api/v1/auth/two-factor/verify-otp | `{ code, trustDevice? }` | `{ token, user }` and session cookie | Pending 2FA | Verified (better-auth 1.7.x) |
| Verify authenticator code | POST /api/v1/auth/two-factor/verify-totp | `{ code, trustDevice? }` | `{ token, user }` and session cookie | Pending 2FA | Verified (better-auth 1.7.x) |
| Products | GET /api/v1/products | `findProductSchema` query: `page` (default 1), `limit` (default 10, max 100), `packName` (enum), `categoryId` (uuid), `brandId` (uuid), `size` (string) | Array of product objects: `{ id, name, categoryId, brandId, packName, size, packsPerBag, piecesPerPack, bagPrice, retailPrice, stockPacks, active, createdAt, updatedAt }` | StaffGuard (staff/owner) | Verified (controller & repo) |
| Products | GET /api/v1/products/options | `findProductSchema` query | Distinct `{ packName, sizes, bagPrice, retailPrice }[]` | StaffGuard | Verified (controller & repo) |
| Products | GET /api/v1/products/:id | `findProductSchema` query | Product detail array | StaffGuard | Verified (controller & repo) |
| Products | POST /api/v1/products | `createProductSchema` (body) | Created product | OwnerGuard | Verified (controller) |
| Products | PATCH /api/v1/products/:id | `updateProductSchema` (body) | Updated product | OwnerGuard | Verified (controller) |
| Categories | GET /api/v1/categories | None | Array of `{ id, name, active }` | StaffGuard | Verified (controller) |
| Brands | GET /api/v1/brands | None | Array of `{ id, name, active }` | StaffGuard | Verified (controller) |
| Stock Movements | GET /api/v1/stock/movements | `findStockSchema` query: `page` (default 1, min 1), `limit` (default 20, min 1, max 100) | Paginated envelope `{ data: StockMovement[], page, limit, total }`; ordered by createdAt desc, id desc | StaffGuard | Verified (controller, service & DTO) |
| Stock Movement | GET /api/v1/stock/movements/:id | None (id via `ParseUUIDPipe`; invalid UUID is rejected) | Single StockMovement object `{ id, productId, type, changePacks, supplierId, saleItemId, requestId, note, createdBy, createdAt }`; 404 `Stock movement not found` if missing | StaffGuard | Verified (controller & service) |
| Stock Additions | POST /api/v1/stock/additions | `createStockSchema`: `{ requestId: uuid (required, client-generated idempotency key), productId: uuid, type?: 'Opening' \| 'Receipt' (default 'Receipt'), unit: 'Bag' \| 'Pack', quantity: int 1..1,000,000, supplierId?: int }` | `{ addStock: StockMovement[], updateProduct: { id, stockPacks }[], replayed: boolean }`; `replayed: true` means the same requestId was retried and the original result is returned | StaffGuard | Verified (controller, service & DTO) |
| Stock Adjustments | POST /api/v1/stock/adjustments | `adjustStockSchema`: `{ requestId: uuid (required, client-generated idempotency key), productId: uuid, type?: 'Adjustment' (default), unit: 'Bag' \| 'Pack', quantity: int 1..1,000,000, changePack: 'Add' \| 'Sub', note: string (trimmed, 1..500, required), supplierId?: int }` | `{ addStock: StockMovement[], updateProduct: { id, stockPacks }[], replayed: boolean }` | OwnerGuard (owners only) | Verified (controller, service & DTO) |
| Suppliers | GET /api/v1/suppliers | None | Array of `{ id, name, phone, active, createdAt, updatedAt }` | StaffGuard | Verified (controller & service) |
| Supplier | GET /api/v1/suppliers/:id | None (id via `ParseIntPipe`) | Single supplier object | StaffGuard | Verified (controller) |
| Supplier create | POST /api/v1/suppliers/add | `createSupplierSchema` (drizzle-zod insert schema of suppliers table) | Created supplier | OwnerGuard | Verified (controller) |
| Supplier update | PATCH /api/v1/suppliers/update/:id | `updateSupplierSchema` (drizzle-zod update schema of suppliers table) | Updated supplier | OwnerGuard | Verified (controller) |
| Sales | POST /api/v1/sales | `createSaleSchema`: `{ requestId: uuid (required, client-generated idempotency key), customerId?: uuid, amountPaid: string matching ^\d{1,12}(\.\d{1,2})?$, items: [{ productId: uuid, unit: 'Bag' \| 'Pack', quantity: int 1..1,000,000 }] (1..100 items; a product cannot repeat with the same unit) }` | `{ sale: Sale, items: SaleItem[], payment: Payment[] (0 or 1), updatedProduct: { id }[], stockMovement: StockMovement[], replayed: boolean }` | StaffGuard | Verified (controller, service & DTO) |
| Sales list | GET /api/v1/sales | `findSalesSchema` query: `page` (default 1), `limit` (default 20, max 100) | `{ data: Sale[], page, limit, total }`, ordered `soldAt` desc then `id` desc; rows contain no items, payments, customer name, or balance | StaffGuard | Verified (controller & service) |
| Sale detail | GET /api/v1/sales/:id | None (id via `ParseUUIDPipe`) | `{ ...Sale, items: SaleItem[] }`; no payments or balance; 404 `Sale not found` if missing | StaffGuard | Verified (controller & service) |
| Customers | GET /api/v1/customers | None | Array of `{ id, name, phone, active, createdAt, updatedAt }` (full list, no pagination, no balances) | StaffGuard | Verified (controller & service) |
| Customer detail | GET /api/v1/customers/:id | None (id via `ParseUUIDPipe`) | Array containing the customer (the service uses `.where()` without `.limit(1)`); `[]` when the id is unknown | StaffGuard | Verified (controller & service) |
| Customer create | POST /api/v1/customers | `createCustomerSchema` (drizzle-zod insert schema; only `name` required, `phone` optional) | Drizzle `.returning()` array with the created customer | StaffGuard | Verified (controller & service) |
| Customer update | PATCH /api/v1/customers/update/:id | `updateCustomerSchema` (partial insert schema: `name?`, `phone?`, `active?`) | Drizzle `.returning()` array with the updated customer | StaffGuard | Verified (controller) |
| Customer statement | GET /api/v1/customers/:id/statement | None (id via `ParseUUIDPipe`) | `{ customer, totals: { salesTotal, moneyReceived, outstandingDebt }, sales: [{ id, soldAt, totalAmount, paidAmount, balanceDue, paymentStatus: 'UNPAID' \| 'PAID' \| 'PART_PAID', items, payments }] }`; sales ordered `soldAt` desc, payments ordered `paidAt` asc; 404 `Customer not found` | StaffGuard | Verified (controller & service) |
| Repayment | POST /api/v1/customers/:id/repayments | `recordRepaymentSchema`: `{ requestId: uuid, saleId: uuid, amount: string matching ^(?=.*[1-9])\d{1,12}(\.\d{1,2})?$ }` | `{ payment, saleId, totalAmount, paidAmount, balanceDue }`; 400 over outstanding, 404 unknown sale for this customer, 409 already paid or requestId reused with a different payload | StaffGuard | Verified (controller & service) |
| Monthly report | GET /api/v1/reports/monthly | `monthSchema` query `month` matching `^\d{4}-(0[1-9]\|1[0-2])$`; the service also rejects `0000` | `{ month, timezone: 'Africa/Lagos', salesTotal, moneyReceived, outstandingDebtAtMonthEnd, productsSold: [{ productId, productName, bagsSold, retailPacksSold, totalPacksSold }], closingStock: [{ productId, productName, closingPacks }] }`; money fields are numeric strings | StaffGuard | Verified (controller, service, query & DTO) |
| Staff (invites/create) | See StaffController/Service | InviteStaffDto, CreateStaffDto, AcceptInviteDto | Various | StaffGuard + OwnerGuard | Partially verified |

### Product Schema Limitations & Notes:
- **No Free-Text Search**: Backend `findProductSchema` does not have a `search` or `q` parameter. Free-text search is filtered client-side across fetched records.
- **No SKU Field**: Backend `products` table does not contain an `sku` column. Products are distinguished by name, packName, size, and piecesPerPack.
- **Prices**: `retailPrice` (pack price) and `bagPrice` (carton price) are stored as PostgreSQL `numeric(14,2)` string values (e.g., `"4500.00"`).

### Stock Contract Notes:
- **Idempotency**: Both `POST /api/v1/stock/additions` and `POST /api/v1/stock/adjustments` require a client-generated `requestId` (UUID). Retrying the same `requestId` replays the original result (`replayed: true`) instead of applying the change twice. The frontend generates it with `crypto.randomUUID()` and keeps it across retry attempts until the backend confirms success.
- **Unit Conversion**: `unit: 'Bag'` means `quantity` is in cartons (converted to packs via the product's `packsPerBag` server-side); `unit: 'Pack'` means `quantity` is already in packs.
- **Quantity Limits**: `quantity` must be an integer from 1 to 1,000,000. Stock balances cannot go negative (DB check constraint `stock_cannot_be_negative`); violations return 409 Conflict.
- **Additions Rules**: `type: 'Opening'` is only allowed when the product has zero stock and no prior movements (409 otherwise). Inactive products reject additions (409). A provided `supplierId` must reference an active supplier (404 otherwise).
- **Adjustments Rules**: Adjustments are always recorded as `type: 'Adjustment'` movements with a required `note` (1..500 chars). `changePack: 'Sub'` rejects if stock is insufficient (409).
- **Response Shape**: Mutations return `{ addStock: StockMovement[], updateProduct: { id, stockPacks }[], replayed: boolean }`. `updateProduct` contains only the product id and new balance — not a full product object.
- **Movements Pagination**: `GET /api/v1/stock/movements` is paginated (`page` default 1, `limit` default 20 max 100) and returns `{ data, page, limit, total }`. There is no `productId` filter — per-product history must be filtered client-side.

### Sales Contract Notes:
- **Prices Are Server-Side**: `POST /api/v1/sales` never accepts prices. Each line is priced from the product row at save time (`bagPrice` for `unit: 'Bag'`, `retailPrice` for `unit: 'Pack'`). A product with a zero price for the requested unit is rejected (400 `Price is not configured for ...`).
- **Idempotency**: `requestId` (UUID, client-generated) is unique per sale. Retrying the same id with the same payload (items, customerId, amountPaid) replays the original result (`replayed: true`); reusing the id with a different payload returns 409 `Request ID has already been used for a different sale`. The initial payment row's requestId is derived deterministically from the sale's requestId (sha256-based UUID).
- **Payment Rules**: `amountPaid` is a string matching `^\d{1,12}(\.\d{1,2})?$` (up to 2 decimals). It cannot exceed the sale total (400). If it is less than the total, `customerId` is required (400 `A customer is required for an unpaid balance`). `amountPaid: "0"` is valid and records no payment row.
- **Stock Rules**: Stock is deducted transactionally per product (combined across lines). Insufficient stock returns 409 `Insufficient stock for <name>`; inactive products return 409; unknown products/customers return 404. Products are locked in sorted id order to avoid deadlocks.
- **Line Constraints**: 1..100 items per sale; the same product cannot appear twice with the same unit (different units are allowed and combine against one stock balance).
- **Response Shape**: `{ sale, items, payment, updatedProduct, stockMovement, replayed }`. Note `updatedProduct` is `[{ id }]` — ids only, no stock balances (unlike stock mutations which return `{ id, stockPacks }`).
- **Money Storage**: All money columns are PostgreSQL `numeric(14,2)` returned as strings; the backend converts to integer kobo (`* 100`) for arithmetic. The frontend mirrors this in `src/lib/utils/money.ts` to avoid floating-point drift.
- **No Payment Method / Sale Type Columns**: The `payments` table has only `{ id, saleId, amount, recordedBy, requestId, paidAt }`; the `sales` table has no sale-type column. Cash/credit is derived from `itemsTotal` vs payments. The design's "Payment method" and "Sale type" fields cannot be persisted and are not sent.
- **Sales List/Detail**: `GET /api/v1/sales` is paginated (`{ data, page, limit, total }`, soldAt desc). `GET /api/v1/sales/:id` returns the sale with `items` embedded. Neither returns payments; use the customer statement for payment data.
- **No List Search/Filter or Aggregates**: `findSalesSchema` accepts only `page` and `limit`. There is no search, customer, or payment-state filter, and list rows carry no item count, paid amount, or balance. The daily "Sales today / Paid today / Balance owed" figures in `sales.svg` have no endpoint; `GET /api/v1/reports/monthly` is month-based only.
- **No Customer Name in Sales**: Sale rows expose only `customerId`. The frontend maps names from one `GET /api/v1/customers` request instead of requesting a statement per sale.
- **Walk-In Invariant**: `POST /api/v1/sales` rejects `amountPaid < itemsTotal` when `customerId` is absent, so a sale without a customer is fully paid at the point of sale. Its payment history is still not exposed by the sales endpoints; it is only reachable through a customer statement.
- **Statement Reuse for Sale Detail**: For a sale with a customer, one `GET /api/v1/customers/:id/statement` call supplies that sale's `paidAmount`, `balanceDue`, `paymentStatus`, and `payments`. No per-row fan-out is performed for the sales list.

### Customers Contract Notes:
- **No Pagination**: `GET /api/v1/customers` returns the full list, ordered as PostgreSQL returns the rows (no `ORDER BY`).
- **No List Aggregates**: The customer list contains no balance, payment, or last-sale fields. Fetching one statement per customer would exceed the global 3 requests/second throttle, so the frontend directory omits those design columns and shows them on the statement instead.
- **Detail Returns an Array**: `GET /api/v1/customers/:id` returns a `.where()` array; the frontend takes `[0]` and treats `[]` as not found.
- **Create/Update**: `POST /api/v1/customers` requires only `name`; `phone` is optional. `PATCH /api/v1/customers/update/:id` accepts any subset of `{ name, phone, active }`. Both return `.returning()` arrays (the frontend takes `[0]`). There is no delete endpoint; deactivate with `active: false`.
- **Stored Fields Only**: The `customers` table has `id`, `name`, `phone`, `active`, `createdAt`, `updatedAt`. Address, town/LGA, state, and notes are not stored.
- **Statement**: `GET /api/v1/customers/:id/statement` computes `paymentStatus` per sale (`UNPAID` / `PART_PAID` / `PAID`) and totals (`salesTotal`, `moneyReceived`, `outstandingDebt`) in one read-only repeatable-read transaction. Sales are newest first; each sale embeds its items and payments. A customer with no sales returns zeroed totals and `sales: []`.
- **Repayments**: `POST /api/v1/customers/:id/repayments` requires `requestId` (UUID idempotency), `saleId`, and a positive amount with at most 2 decimals. It locks the sale, rejects amounts over the outstanding balance (400), rejects fully paid sales (409), and replays a matching `requestId` instead of double-charging. Reusing a `requestId` with a different sale or amount returns 409. Repayments do not change stock.
- **No Payment Method/Type**: The `payments` table has only `{ id, saleId, amount, recordedBy, requestId, paidAt }`. Method, entered payment date, reference, and an "at sale"/"repayment" type are not stored; the frontend shows `paidAt` and `amount` only.
- **Sale References**: Sales use UUID primary keys; there is no human-readable `SL-####` column, so the UI shows the first 8 characters of the UUID and keeps the full id in a tooltip.

### Reports Contract Notes:
- **Monthly Only**: `GET /api/v1/reports/monthly` is the only verified reporting endpoint. It takes `month=YYYY-MM` and has no daily, weekly, or range variant.
- **Month Boundaries**: The backend converts `YYYY-MM-01 00:00:00` and the following month to `Africa/Lagos` and filters with `>= start` and `< end`, so a report covers exactly one local calendar month. The frontend sends the month and never computes totals itself.
- **salesTotal vs moneyReceived**: `salesTotal` sums `sales.itemsTotal` for sales `soldAt` in the month. `moneyReceived` independently sums `payments.amount` with `paidAt` in the month, so it includes repayments of earlier sales and excludes payments made after the month.
- **outstandingDebtAtMonthEnd**: Sum of `greatest(itemsTotal - payments made before month end, 0)` across **all** customer sales before month end — a cumulative balance, not just that month's sales. Later repayments do not retroactively change the figure.
- **productsSold**: Grouped by product for sales in the month. `bagsSold` counts `unit: 'Bag'` quantities (cartons), `retailPacksSold` counts `unit: 'Pack'` quantities, and `totalPacksSold` sums `quantity × packsPerUnit`. Names come from the joined product row.
- **closingStock**: Sum of `stockMovements.changePacks` per product created before month end, including movements dated before month end. It is a historical month-end balance, not current stock.
- **Read Consistency**: The whole report is produced in one read-only `repeatable read` transaction.
- **No Daily Overview**: The supplied `overview.svg` shows "Sales today / Payments received / Customer balances / Low stock / Recent sales", which no endpoint provides. The screen therefore uses the monthly figures and omits the daily cards, low-stock alert, and recent-sales table.

## Money and Quantities

Verified from backend `products-and-stocks.ts` schema:
- `retailPrice`: numeric(14, 2) string representing pack price in Naira.
- `bagPrice`: numeric(14, 2) string representing bag/carton price in Naira.
- `stockPacks`: integer representing base stock in packs (cannot be negative: `stock_cannot_be_negative` check constraint).
- `packsPerBag`: integer (> 0).
- `piecesPerPack`: integer (nullable, > 0 if present).
- `packName`: enum `'Small Pack' | 'Twin Pack' | 'Jumbo Pack' | 'Wipes' | 'Pad' | 'Tissue'`.

## Errors
Global pipes: ValidationPipe with whitelist/forbidNonWhitelisted/transform, StandardSchemaValidationPipe. Better Auth errors follow its format. Handle standard HTTP errors and network failures.

## Notes
- API prefix is /api/v1. Auth is under /api/v1/auth.
- CORS allows credentials from FRONTEND_URL.
- No JWT assumed; use cookie-based sessions.
- Owner vs Staff: role enum exists; OwnerGuard used on some product mutations.
