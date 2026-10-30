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
- plugins: twoFactorPlugin (issuer 'Everybuy', email OTP period 3 min; OTP 6 digits; TOTP defaults 6 digits/30 seconds; plugin endpoints limited to 3 requests/10 seconds)
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
- **Verification email request**: `POST /api/v1/auth/send-verification-email` accepts `{ email, callbackURL? }` and returns `{ status: true }` only after the configured send callback succeeds. The endpoint is public for signed-out requests; unknown/already-verified emails receive a success-shaped response to avoid account enumeration. Better Auth's installed sign-in handler only sends automatically if `emailVerification.sendOnSignIn` is enabled; the mounted backend does not set it, so the frontend explicitly calls this endpoint after `EMAIL_NOT_VERIFIED` and offers retry.
- **Origin check**: sign-in validates the browser `Origin` against `trustedOrigins` (`FRONTEND_URL`, default `http://localhost:5173`). A mismatch returns 403 `INVALID_ORIGIN`. The frontend origin must match `FRONTEND_URL` exactly.
- **Two-factor login**: after the credential handler creates a session, the plugin after-hook deletes it, clears the session cookie, and issues a signed pending challenge cookie valid for 10 minutes. The response is `{ twoFactorRedirect: true, twoFactorMethods }`; it is not an authenticated session. The methods list contains `totp` only when a verified per-user TOTP secret exists, and `otp` whenever the email sender is configured. Backup-code use is available through its own verification endpoint but is not listed in `twoFactorMethods`.
- **TOTP**: available (default enabled, 6 digits, 30-second period). Enrollment requires an authenticated session and password. `enable` returns the setup URI and 10 backup codes but keeps TOTP unverified; `verify-totp` with a valid authenticator code completes enrollment and turns on `twoFactorEnabled`. TOTP secrets are encrypted in the two-factor table. Invalid TOTP codes return `INVALID_CODE`.
- **Email 2FA OTP**: configured through the existing `sendEmail`/Resend callback, six digits and valid for 3 minutes. `send-otp` requires the pending challenge cookie; `verify-otp` accepts that challenge and creates the session only after valid verification. The plugin allows 5 wrong attempts per email code and the global plugin rate limit is 3 requests per 10 seconds for all `/two-factor/*` routes. The installed plugin defaults OTP storage to plaintext in `verification.value`; configure `storeOTP: 'hashed'` to avoid retaining a usable code in the database.
- **Email OTP delivery limitation**: in installed Better Auth 1.7.10, `send-otp` catches and logs rejected `sendOTP` callbacks, then still returns `{ status: true }`. Thus this response confirms the endpoint ran, but does not reliably confirm provider acceptance. Frontend copy must not overstate delivery until the backend surfaces that failure.
- **Backup codes**: configured by the plugin default; 10 codes, each formatted `xxxxx-xxxxx`, encrypted at rest. `verify-backup-code` works with the pending challenge cookie and consumes a code once using a compare-and-set update. `generate-backup-codes` requires a signed-in session and password; it replaces the stored set and returns new codes once. A server-only `viewBackupCodes` method is not an HTTP endpoint and must not be exposed by the frontend.
- **Disable 2FA**: requires a signed-in sensitive session and the account password; removes the two-factor row and updates the session cookie. The frontend must re-read the session after state changes.
- **Rate and lockout behavior**: plugin endpoints under `/two-factor/*` are limited to 3 requests per 10 seconds. The pending challenge cookie expires after 10 minutes. OTP values expire after 3 minutes and allow five attempts per code; TOTP and recovery verification use a five-attempt challenge counter. Account lockout defaults to 10 consecutive failures across challenges for 15 minutes. TOTP codes use the default 6 digits and 30-second period.
- **2FA error handling**: Better Auth returns `{ message, code }`. Relevant plugin codes are `INVALID_PASSWORD`, `OTP_NOT_CONFIGURED`, `OTP_NOT_ENABLED`, `OTP_HAS_EXPIRED`, `TOTP_NOT_CONFIGURED`, `TOTP_NOT_ENABLED`, `TOTP_ALREADY_ENABLED`, `TWO_FACTOR_NOT_ENABLED`, `BACKUP_CODES_NOT_ENABLED`, `INVALID_BACKUP_CODE`, `INVALID_CODE`, `TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE`, `ACCOUNT_TEMPORARILY_LOCKED`, and `INVALID_TWO_FACTOR_COOKIE`. Also handle HTTP 401 for invalid or expired challenges, HTTP 429 for throttling/lockout, and 5xx/network errors for server or provider failures.
- **Email verification is separate**: `/send-verification-email` sends a link to set `emailVerified`; `/two-factor/send-otp` sends a short-lived numeric sign-in code. Neither flow substitutes for the other.
- **Production mail configuration**: `RESEND_API_KEY` is required by `src/email/send-email.ts`; the backend sender is `EveryBuy <no-reply@mail.loixrang.com>`. The sender domain must be verified with Resend. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `FRONTEND_URL` must also be configured for signed cookies, callback URLs and trusted browser origin. The deployed frontend must use the matching `VITE_API_BASE_URL` and origin.
- **Backend-only limitations retained for this frontend-only implementation**: `otpOptions` does not set `storeOTP`, so Better Auth 1.7.10 stores short-lived OTP values in plaintext by default. Its `send-otp` handler catches a rejected mail callback and still returns `{ status: true }`; the frontend can only state that the request was accepted and cannot distinguish this provider failure from delivery success without a backend change.
- **Frontend implementation**: the frontend uses its shared `apiFetch` with configured base URL and `credentials: 'include'`; it does not install the Better Auth browser SDK or store returned session tokens. TOTP enrollment remains inactive until `/verify-totp` returns `{ token, user }`. Sign-in remains unauthenticated while the challenge cookie is pending; the provider changes state only after a verification endpoint returns a valid `{ token, user }` response.
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
| Send verification email | POST /api/v1/auth/send-verification-email | `{ email, callbackURL? }` | `{ status: true }`; non-2xx when mail sending fails | Public (Better Auth) | Verified (backend config and installed Better Auth 1.7.x) |
| Sign out | POST /api/v1/auth/sign-out | `{}` (body optional) | `{ success: true }` and cookie cleared | Session cookie | Verified (better-auth 1.7.x) |
| Send 2FA code | POST /api/v1/auth/two-factor/send-otp | `{}` (optional `trustDevice`) | `{ status: true }`; requires the signed 2FA challenge cookie | Pending 2FA | Verified (better-auth 1.7.x) |
| Verify emailed 2FA code | POST /api/v1/auth/two-factor/verify-otp | `{ code, trustDevice? }` | `{ token, user }` and session cookie | Pending 2FA | Verified (better-auth 1.7.x) |
| Verify authenticator code | POST /api/v1/auth/two-factor/verify-totp | `{ code, trustDevice? }` | `{ token, user }` and session cookie | Pending 2FA | Verified (better-auth 1.7.x) |
| Enable TOTP | POST /api/v1/auth/two-factor/enable | `{ password, method: 'totp', issuer? }` | `{ method: 'totp', totpURI, backupCodes }`; TOTP remains pending until verified | Session + password | Verified (Better Auth 1.7.10 source/types) |
| Verify/complete TOTP enrollment | POST /api/v1/auth/two-factor/verify-totp | `{ code, trustDevice? }` | `{ token, user }`; session cookie is set/rotated; sets `twoFactorEnabled` only after valid setup code | Session during enrollment, or pending challenge at login | Verified (Better Auth 1.7.10 source/types) |
| Disable 2FA | POST /api/v1/auth/two-factor/disable | `{ password }` | `{ status: true }`; session cookie is rotated | Sensitive session + password | Verified (Better Auth 1.7.10 source/types) |
| Send email 2FA OTP | POST /api/v1/auth/two-factor/send-otp | `{ trustDevice? }` or `{}` | `{ status: true }`; see mail failure limitation above | Pending challenge cookie | Verified (Better Auth 1.7.10 source/types) |
| Verify email 2FA OTP | POST /api/v1/auth/two-factor/verify-otp | `{ code, trustDevice? }` | `{ token, user }` and session cookie on login challenge | Pending challenge (or authenticated session) | Verified (Better Auth 1.7.10 source/types) |
| Verify backup code | POST /api/v1/auth/two-factor/verify-backup-code | `{ code, disableSession?, trustDevice? }` | `{ token, user }` and session cookie on login challenge | Pending challenge (or authenticated session) | Verified (Better Auth 1.7.10 source/types) |
| Regenerate backup codes | POST /api/v1/auth/two-factor/generate-backup-codes | `{ password }` | `{ status: true, backupCodes: string[] }`; previous codes are replaced | Session + password; 2FA must be enabled | Verified (Better Auth 1.7.10 source/types) |
| Get TOTP setup URI | POST /api/v1/auth/two-factor/get-totp-uri | `{ password }` | `{ totpURI }` | Session + password; a TOTP row must exist | Verified (Better Auth 1.7.10 source/types) |
| Generate TOTP value | Server-only `auth.api.generateTOTP` (no HTTP route) | `{ secret }` | `{ code }` | Server-only method | Verified; not called by frontend |
| View backup codes | Server-only `auth.api.viewBackupCodes` | `{ userId }` | `{ status, backupCodes }` | Server-only; no HTTP endpoint or browser client method | Verified; not called by frontend |
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
| Staff list | GET /api/v1/staff | None | Array of `{ staffId, userId, name, role: 'Owner' \| 'Staff' }`; 404 `No staff found` when empty; no email, active flag, or timestamps | StaffGuard + OwnerGuard | Verified (controller, guard & repository) |
| Staff create | POST /api/v1/staff | `{ name, email, password }` (password length 12–128) | `{ id, userId, name, email, role, active }`; 409 when the email already exists; sends a verification email | StaffGuard + OwnerGuard | Verified (controller, service & DTO) |
| Staff invite | POST /api/v1/staff/invite | `{ name, email }` | `{ message, email, expiresAt }`; 409 existing user or pending invite; 500 when `STAFF_INVITE_PREVIEW_URL` is missing; 503 when the email fails | StaffGuard + OwnerGuard | Verified (controller, service & DTO) |
| Invitation preview | GET /api/v1/staff/invite/preview | Query `token` (64 hex chars) | `{ name, email, expiresAt }`; 400 for invalid, expired, or used tokens | Public (`@AllowAnonymous`) | Verified (controller & service) |
| Invitation accept | POST /api/v1/staff/invite/accept | `{ token, password }` (password length 12–128) | `{ message, staff }`; 400 invalid/expired token; 409 when the account already exists | Public (`@AllowAnonymous`) | Verified (controller & service) |

### Product Schema Limitations & Notes:
- **No Free-Text Search**: Backend `findProductSchema` does not have a `search` or `q` parameter. Free-text search is filtered client-side across fetched records.
- **No SKU Field**: Backend `products` table does not contain an `sku` column. Products are distinguished by name, packName, size, and piecesPerPack.
- **Prices**: `retailPrice` (pack price) and `bagPrice` (bag price) are stored as PostgreSQL `numeric(14,2)` string values (e.g., `"4500.00"`).

### Stock Contract Notes:
- **Idempotency**: Both `POST /api/v1/stock/additions` and `POST /api/v1/stock/adjustments` require a client-generated `requestId` (UUID). Retrying the same `requestId` replays the original result (`replayed: true`) instead of applying the change twice. The frontend generates it with `crypto.randomUUID()` and keeps it across retry attempts until the backend confirms success.
- **Unit Conversion**: `unit: 'Bag'` means `quantity` is in bags (converted to packs via the product's `packsPerBag` server-side); `unit: 'Pack'` means `quantity` is already in packs.
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
- **Access**: All report endpoints use `StaffGuard`.
- **Daily Overview**: `GET /api/v1/reports/overview` returns `{ salesToday: { count, total }, paymentsReceived, customerBalances, lowStock, recentSales }`. Sales and payments are for the current Africa/Lagos day. `customerBalances` is current outstanding debt across all customer sales (not just today's sales); `lowStock` contains active products with 10 packs or fewer; `recentSales` is limited to five. The response is calculated in one read-only repeatable-read transaction.
- **Monthly Report**: `GET /api/v1/reports/monthly?month=YYYY-MM` returns `{ month, timezone, salesTotal, moneyReceived, outstandingDebtAtMonthEnd, productsSold, closingStock }`.
- **Month Boundaries**: The backend converts `YYYY-MM-01 00:00:00` and the following month to `Africa/Lagos` and filters with `>= start` and `< end`, so a report covers exactly one local calendar month. The frontend sends the month and never computes totals itself.
- **salesTotal vs moneyReceived**: `salesTotal` sums `sales.itemsTotal` for sales `soldAt` in the month. `moneyReceived` independently sums `payments.amount` with `paidAt` in the month, so it includes repayments of earlier sales and excludes payments made after the month.
- **outstandingDebtAtMonthEnd**: Sum of `greatest(itemsTotal - payments made before month end, 0)` across **all** customer sales before month end — a cumulative balance, not just that month's sales. Later repayments do not retroactively change the figure.
- **productsSold**: Grouped by product for sales in the month. `bagsSold` counts `unit: 'Bag'` quantities (bags), `retailPacksSold` counts `unit: 'Pack'` quantities, and `totalPacksSold` sums `quantity × packsPerUnit`. Names come from the joined product row.
- **closingStock**: Sum of `stockMovements.changePacks` per product created before month end, including movements dated before month end. It is a historical month-end balance, not current stock.
- **Read Consistency**: The whole report is produced in one read-only `repeatable read` transaction.
- **Profit Report**: `GET /api/v1/reports/profit?month=YYYY-MM` returns `{ revenue, cogs, grossProfit, expenses, netProfit }`. Revenue sums sale totals for sales in the month; COGS sums quantity × packs-per-unit × saved cost-per-pack; expenses are summed by `spentAt`; gross profit is revenue minus COGS and net profit subtracts expenses. It returns 409 if any sale item in the month has a null saved cost-per-pack.

### Expenses Contract Notes:
- **Access and shape**: `GET /api/v1/expenses` and `POST /api/v1/expenses` use `StaffGuard`. The list returns all expenses, ordered by `spentAt` descending then id descending; it is not paginated. Rows have `{ id, requestId, title, category, amount, notes, spentAt, recordedBy, createdAt }`.
- **Create validation**: `POST` requires UUID `requestId`, trimmed title (1–120 chars), category (1–80 chars), positive decimal amount as a string (up to 12 integer and 2 fractional digits), optional notes (up to 500 chars), and optional ISO datetime with an explicit offset for `spentAt`.
- **Idempotency**: Repeating a requestId with the same effective payload returns the existing expense. Reusing it with different details returns 409. The audit row is written only for a new expense.

### Audit Contract Notes:
- `GET /api/v1/audit` is StaffGuard and returns all entries, newest first, with `{ actor, action, entity, entityId, at, detail }`. Actor uses the user name, then actor id, then `Unknown`. Currently expense creation is the only operation recorded. There is no pagination or filter parameter.

### Shop Settings Contract Notes:
- `GET /api/v1/settings/shop` is StaffGuard and returns one settings row `{ id, name, address, phone, currency, timezone, receiptFooter }`; it returns 404 if the row is absent.
- `PATCH /api/v1/settings/shop/:id` requires `StaffGuard` and `OwnerGuard` and returns the updated database row. The controller does not attach the declared Zod schema to `@Body()`, so that schema is not applied at runtime. The frontend sends only `{ name, address, phone, currency, timezone, receiptFooter }` and reports a missing row; no create endpoint exists.

### Stocktake Contract Notes:
- **No verified stocktake API in the inspected backend checkout (2026-10-29)**: database schema contains `stocktakes`, `stocktake_items`, and a `Draft | Finalized | Cancelled` status enum, but no controller, service, DTOs, or registered module exposes a count lifecycle. The backend README states there is no separate stocktake session or approval pipeline in this release.
- Existing stock endpoints (`POST /api/v1/stock/adjustments`, guarded by StaffGuard and OwnerGuard) support a direct reasoned correction only. They do not create count sessions, record counted quantities, or approve a count. Do not use them to simulate the missing workflow.

### Staff and Invitation Contract Notes:
- **Owner-Only Staff Reads**: `StaffController` applies `StaffGuard` then `OwnerGuard`, so `GET /staff`, `POST /staff` and `POST /staff/invite` all require an owner. Staff accounts receive 403 `Owner access required`.
- **List Shape**: `GET /api/v1/staff` joins `staff` to `user` and returns only `{ staffId, userId, name, role }`. It throws 404 `No staff found` when the table is empty (the frontend treats that as an empty team).
- **No Role Management**: There is no endpoint to change a role, deactivate, or remove a member, and no endpoint to list, resend, or revoke pending invitations.
- **Invite Delivery**: `POST /api/v1/staff/invite` builds a link from `STAFF_INVITE_PREVIEW_URL`, appends `?token=…`, and sends it with Resend. It throws 500 when the URL is unset and 503 when delivery fails (deleting the pending invite so the owner can retry). Tokens are 64 hex characters, hashed in the database, and expire after 24 hours.
- **Public Token Endpoints**: `GET /api/v1/staff/invite/preview` and `POST /api/v1/staff/invite/accept` are `@AllowAnonymous()`; the token itself is the credential. Anything other than a 64-hex token is rejected with 400 before a database lookup.
- **Direct Creation**: `POST /api/v1/staff` creates the Better Auth user through a server-side provisioning instance and immediately adds a `Staff` row. The owner supplies the initial password (12–128 characters) and the user must still verify their email before signing in.
- **No Role in the Session**: `/get-session` exposes no staff role. The frontend must not infer permissions from the session; it attempts owner-only requests and reacts to 403.
- **Throttle**: The global limits (3 requests/second, 100/minute) also apply to these endpoints. The settings screen issues one staff-list request and never fans out per member.

## Money and Quantities

Verified from backend `products-and-stocks.ts` schema:
- `retailPrice`: numeric(14, 2) string representing pack price in Naira.
- `bagPrice`: numeric(14, 2) string representing the bag price in Naira.
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
