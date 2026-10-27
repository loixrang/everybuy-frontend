# Current Task

## FE-001: Frontend Foundation

Status: WORKING

## Goal

Create the initial React frontend foundation for Everybuy using the supplied physical inventory design and the existing backend contract.

## Scope

- Scaffold React, TypeScript, and Vite.
- Configure Tailwind CSS.
- Configure routing.
- Establish the application structure.
- Integrate design tokens and typography.
- Support light and dark themes.
- Implement the responsive inventory application shell.
- Establish the API client foundation.
- Verify the existing backend authentication and API contract.
- Configure type checking, linting, and production build checks.
- Update project documentation.

## Out of Scope

- Complete product management
- Complete inventory management workflows
- Recording sales
- Recording payments
- Recording purchases
- Stock receiving workflows
- Online store pages
- New backend endpoints
- Backend schema or migration changes

## Acceptance Criteria

- [ ] Project uses React, TypeScript, Vite, Tailwind CSS, and Bun.
- [ ] Application starts using the documented command.
- [ ] Production build passes.
- [ ] Type checking and linting are configured and pass.
- [ ] Design tokens are integrated.
- [ ] Light and dark themes work.
- [ ] Inventory layout responds correctly to mobile, tablet, and desktop widths.
- [ ] Shared components and routes have a clear structure.
- [ ] API base URL is configurable.
- [ ] Backend API and authentication findings are documented.
- [ ] No backend files were modified.
- [ ] No out-of-scope business workflows were implemented.
- [ ] Documentation is updated to reflect the actual implementation.

## Completion Notes

**Implemented:**
- Scaffolded React + TypeScript + Vite app with Bun. Installed Tailwind CSS v4, React Router DOM.
- Integrated design tokens from `design/Everyday_Offline_Design/tokens.css` and copied fonts to `src/assets/fonts/`. Global styles use Manrope/Inter with theme variables.
- Added light/dark theme support with persistence and toggle in header.
- Built responsive inventory application shell: desktop sidebar (228px), mobile bottom navigation, workspace layout, sticky header with blur.
- Created API client foundation (`src/lib/api/client.ts`) with configurable base URL (`VITE_API_BASE_URL`) and `credentials: 'include'` for Better Auth sessions.
- Router configured with overview placeholder and 404; no business workflows implemented.
- Added `.env.example` for API configuration.

**Backend verification (documented in docs/API_CONTRACT.md):**
- API prefix `/api/v1`, Better Auth at `/api/v1/auth` (basePath), cookies/sessions, CORS with credentials from `FRONTEND_URL`. email/password auth with verification, 2FA plugin, rate limiting. Roles `Owner`/`Staff` in schema; `OwnerGuard` used on some product mutations (POST/PATCH). Products: GET `/api/v1/products` AllowAnonymous, others authenticated/guarded as implemented.

**Checks performed:**
- `bun run build` - passed (tsc -b && vite build)
- `bunx tsc -b --noEmit` - passed
- `bun run lint` - completed (oxlint)
- No backend files modified.

**Remaining blockers / notes:**
- Authentication UI not implemented (backend auth verified; can be added when needed). Staff provisioning flow exists on backend.
- Business features (products/sales/purchases) are out of scope for this task.
