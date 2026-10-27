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
| Record sales | Unverified | Unverified | Pending |
| Record payments/repayments | Unverified | Unverified | Pending |
| Receive stock | Unverified | Unverified | Pending |
| Approve stocktakes | Unverified (stated in design Owner only) | Unverified | Pending - enforce server-side |
| Manage staff | Unverified (staff module exists) | Unverified | Pending |

Do not treat as full policy - verify per endpoint.

## Endpoint Inventory (verified where found)

| Feature | Method and Path | Request | Response | Access | Status |
|---|---|---|---|---|---|
| Auth (Better Auth) | Mounted at /api/v1/auth/* (Better Auth handlers) | Better Auth API shapes (see better-auth docs) | Better Auth responses | Varies | Verified (mounted) |
| Products | GET /api/v1/products | `findProductSchema` query: `page` (default 1), `limit` (default 10, max 100), `packName` (enum), `categoryId` (uuid), `brandId` (uuid), `size` (string) | Array of product objects: `{ id, name, categoryId, brandId, packName, size, packsPerBag, piecesPerPack, bagPrice, retailPrice, stockPacks, active, createdAt, updatedAt }` | StaffGuard (staff/owner) | Verified (controller & repo) |
| Products | GET /api/v1/products/options | `findProductSchema` query | Distinct `{ packName, sizes, bagPrice, retailPrice }[]` | StaffGuard | Verified (controller & repo) |
| Products | GET /api/v1/products/:id | `findProductSchema` query | Product detail array | StaffGuard | Verified (controller & repo) |
| Products | POST /api/v1/products | `createProductSchema` (body) | Created product | OwnerGuard | Verified (controller) |
| Products | PATCH /api/v1/products/:id | `updateProductSchema` (body) | Updated product | OwnerGuard | Verified (controller) |
| Categories | GET /api/v1/categories | None | Array of `{ id, name, active }` | StaffGuard | Verified (controller) |
| Brands | GET /api/v1/brands | None | Array of `{ id, name, active }` | StaffGuard | Verified (controller) |
| Staff (invites/create) | See StaffController/Service | InviteStaffDto, CreateStaffDto, AcceptInviteDto | Various | StaffGuard + OwnerGuard | Partially verified |

### Product Schema Limitations & Notes:
- **No Free-Text Search**: Backend `findProductSchema` does not have a `search` or `q` parameter. Free-text search is filtered client-side across fetched records.
- **No SKU Field**: Backend `products` table does not contain an `sku` column. Products are distinguished by name, packName, size, and piecesPerPack.
- **Prices**: `retailPrice` (pack price) and `bagPrice` (carton price) are stored as PostgreSQL `numeric(14,2)` string values (e.g., `"4500.00"`).

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
