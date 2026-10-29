# Everybuy Frontend

React + TypeScript + Vite frontend for **Everybuy**, a shop inventory and sales
management system. The frontend talks to the separately maintained NestJS
backend (`../everybuy`) using Better Auth cookie sessions.

## Requirements

- [Bun](https://bun.sh) 1.4+
- The Everybuy backend running on `http://localhost:3000` (default)

## Setup

```bash
bun install
```

Create `.env.local` if the backend is not on `http://localhost:3000`:

```text
VITE_API_BASE_URL=http://localhost:3000
```

`VITE_*` values are public and must never contain secrets. Authentication uses
httpOnly cookies, so no tokens are stored in the browser.

## Commands

```bash
bun run dev     # start the Vite dev server on :5173
bun run typecheck # check TypeScript without emitting a build
bun run build    # type-check and build for production
bun run lint    # oxlint
bun test        # Bun test runner (unit tests)
```

## Search visibility

Everybuy is an authenticated shop operations app, not a public marketing site.
The document declares `noindex` for crawlers, and route changes set a useful
browser title. No sitemap is published. A separate public landing page should
be created before making Everybuy discoverable in search.

## CI and deployment

GitHub Actions runs typecheck, lint, unit tests, and a production build for
pull requests and pushes to `main` or `master`. On the repository's default
branch, it saves a deployable artifact. The GitHub Pages deployment job is
opt-in and runs only when both repository variables below are set:

- `VITE_API_BASE_URL`: public HTTPS origin of the production API.
- `VITE_BASE_PATH`: slash-delimited asset path; use `/<repository-name>/` for
  a project Pages site or `/` for a custom domain.

Select **GitHub Actions** as the Pages publishing source in repository settings.
The backend must allow the deployed frontend origin through `FRONTEND_URL` and
credentialed CORS. Because the app uses Better Auth cookies, confirm the chosen
frontend/API hostnames work with the production cookie policy before enabling
deployment. `VITE_*` values are public configuration, never secrets.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for setup details.

## Screens

- `/signin` — email/password sign-in with two-factor support
- `/inventory` — product list, detail, setup, stock receiving
- `/movements` — stock movement history
- `/sales` — sales history and sale details
- `/customers` — customer directory, statements and repayments
- `/overview` — daily and monthly reports (sales, receipts, debt, product sales, closing stock, and profit)
- `/settings` — profile, appearance, team management and session
- `/accept-invite` — staff invitation landing page (public)

## Conventions

- Read `AGENTS.md` and the documents in `docs/` before changing behaviour.
- Verify API shapes against the backend source; do not invent endpoints or fields.
- Keep API access in `src/lib/api` and UI state in pages/components.
- Design tokens live in `src/styles/tokens.css` and drive both light and dark themes.
