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
bun run build   # type-check and build for production
bun run lint    # oxlint
bun test        # Bun test runner (unit tests)
```

## Screens

- `/signin` — email/password sign-in with two-factor support
- `/inventory` — product list, detail, setup, stock receiving
- `/movements` — stock movement history
- `/sales` — sales history and sale details
- `/customers` — customer directory, statements and repayments
- `/overview` — monthly report (sales, receipts, debt, product sales, closing stock)
- `/settings` — profile, appearance, team management and session
- `/accept-invite` — staff invitation landing page (public)

## Conventions

- Read `AGENTS.md` and the documents in `docs/` before changing behaviour.
- Verify API shapes against the backend source; do not invent endpoints or fields.
- Keep API access in `src/lib/api` and UI state in pages/components.
- Design tokens live in `src/styles/tokens.css` and drive both light and dark themes.
