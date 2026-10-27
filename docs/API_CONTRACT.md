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
| View products | Allowed (GET /api/v1/products has AllowAnonymous in controller? GET / is AllowAnonymous per controller; options and GET :id not marked anonymous - need to confirm) | Unverified - depends on guards | Partially verified (see Products) |
| Create products | Guarded by OwnerGuard (POST /) | Likely forbidden by OwnerGuard | Verified from controller |
| Update products | Guarded by OwnerGuard (PATCH /:id) | Likely forbidden | Verified from controller |
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
| Products | POST /api/v1/products | createProductSchema (validated) | Created product | OwnerGuard | Verified (controller) |
| Products | GET /api/v1/products | findProductSchema (query) | List of products | AllowAnonymous() | Verified (controller) |
| Products | GET /api/v1/products/options | findProductSchema (query) | Options/list variant | Authenticated? (no AllowAnonymous) | Verified (controller) |
| Products | GET /api/v1/products/:id | findProductSchema (query) | Product detail | Authenticated? (no AllowAnonymous) | Verified (controller) |
| Products | PATCH /api/v1/products/:id | updateProductSchema (body) | Updated product | OwnerGuard | Verified (controller) |
| Staff (invites/create) | See StaffController/Service | InviteStaffDto, CreateStaffDto, AcceptInviteDto | Various | Staff module exists; specific guards not fully read - treat as needs verification | Partially verified |
| Sales/Stock/Customers/Suppliers/Brands/Categories/Reports | Modules exist in AppModule | Varies | Varies | Unverified details | Unverified |

## Money and Quantities

From design handoff (must be confirmed against backend DTOs/schemas):
- Money stored as integer kobo (design states). Need to verify actual representation in backend.
- Product base unit is pack; stock tracked in integer packs.
- Packs per carton per product; carton rule (sealed only or loose may form carton).
- Carton/pack prices stored separately.
- Quantities validated server-side.

Do not assume - verify DTOs when implementing specific features.

## Errors
Global pipes: ValidationPipe with whitelist/forbidNonWhitelisted/transform, StandardSchemaValidationPipe. Better Auth errors follow its format. Handle standard HTTP errors and network failures.

## Notes
- API prefix is /api/v1. Auth is under /api/v1/auth.
- CORS allows credentials from FRONTEND_URL.
- No JWT assumed; use cookie-based sessions.
- Owner vs Staff: role enum exists; OwnerGuard used on some product mutations.
