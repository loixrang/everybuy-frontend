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
