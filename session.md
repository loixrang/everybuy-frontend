# Initial Session: Everybuy Frontend Foundation

## Project Context

I am building the frontend for Everybuy, a shop inventory and sales management system.

The frontend repository is:

C:\Users\loixr\projects\everybuy-frontend

The existing backend repository is:

C:\Users\loixr\projects\everybuy

You can inspect both repositories. Treat the backend as read-only unless I explicitly authorize changes.

The frontend has not been scaffolded yet.

Read AGENTS.md and README-AI-PROTOCOL.md before starting.

## Design Reference

The design files are located at:

design/Everyday_Offline_Design/

Read these files first:

- design/Everyday_Offline_Design/DEVELOPER_HANDOFF.md
- design/Everyday_Offline_Design/README.md
- design/Everyday_Offline_Design/tokens.css

Inspect the relevant editable SVG screens under:

design/Everyday_Offline_Design/Editable_SVG/inventory/

The inventory designs are the visual reference for this project.

The archive also contains designs for an online store under Editable_SVG/store. Do not implement the online store during this task. It is future scope.

Follow the supplied visual design instead of creating a generic admin dashboard.

The design reference specifies:

- Manrope as the main font, with Inter as a fallback
- Light and dark themes
- Shared semantic color tokens
- Mobile, tablet, and desktop layouts
- A mobile bottom navigation pattern
- A desktop sidebar and workspace layout
- Consistent spacing, borders, typography, and controls
- Clear loading, disabled, error, and success states

Use the provided tokens and screen designs as the source of truth.

## Main Goal

Set up a clean, maintainable frontend foundation that can later support:

1. Products and stock
2. Sales and payments
3. Purchases and stock receiving

Do not implement these full business features in this session.

The purpose of this session is to establish the project structure, visual foundation, routing approach, API integration foundation, and development checks.

## Step 1: Inspect the Backend

Before implementing frontend authentication or API integration, inspect the existing backend.

Verify:

- Actual API route prefix
- Existing product and inventory routes
- Sales and payment routes, if present
- Purchase and stock receiving routes, if present
- Request DTOs and validation rules
- Response shapes and error formats
- Better Auth configuration and base path
- Whether authentication uses cookies and sessions
- Required Origin and CORS configuration
- How the frontend should maintain an authenticated session
- Actual Owner and staff roles
- Existing permission checks

Do not guess missing details.

Update docs/API_CONTRACT.md with verified information. Mark unknown details as unverified.

If you cannot verify an important detail, report it instead of inventing an answer.

Do not change the backend.

## Step 2: Inspect the Design

Inspect the developer handoff, design tokens, and relevant inventory SVGs.

Determine the correct visual foundation for the physical inventory application.

Follow the specified colors, typography, spacing, control sizes, navigation, and breakpoints.

Use the supplied designs as references for the eventual screens. Do not copy the static HTML viewer into the React application.

Keep the online store outside the current implementation scope.

## Step 3: Scaffold the Frontend

Create the project using React, TypeScript, Vite, Tailwind CSS, and Bun.

Use the current supported setup and avoid unnecessary dependencies.

Before choosing additional libraries, check whether the requirement can be handled cleanly with the existing stack.

Establish:

- Application entry point
- Routing
- Global styles and design tokens
- Light and dark theme foundation
- Responsive application layout
- Shared navigation components
- Shared UI component structure
- API client foundation
- Environment variable configuration
- Error handling foundation
- Type checking and linting
- A working production build

Choose a sensible structure for a frontend that will grow, but do not overengineer it.

Do not introduce a large state management library unless the current requirements justify it.

## Step 4: Build the Visual Foundation

Implement the shared physical inventory application shell.

Use the supplied inventory design to guide:

- Navigation
- Workspace layout
- Typography
- Colors
- Spacing
- Surfaces and borders
- Responsive behavior
- Light and dark themes

The foundation should be ready for later pages without pretending those pages already exist.

Do not invent dashboard statistics or business records.

If a screen needs data that the backend does not yet provide, show an honest empty or unavailable state instead of fabricated production data.

## Step 5: Authentication Foundation

Only implement authentication if the backend inspection confirms how it should work.

Do not assume Better Auth requires manually storing JWTs.

Follow the actual backend session and cookie configuration.

If authentication cannot be implemented correctly because of missing information or configuration, document the blocker and finish the independent foundation work.

Do not modify the backend to work around a frontend issue.

## Step 6: Documentation

Update:

- docs/CURRENT_TASK.md
- docs/ROADMAP.md
- docs/CHANGELOG.md
- docs/ARCHITECTURE.md
- docs/API_CONTRACT.md
- docs/DECISIONS.md

Record verified facts separately from assumptions.

Keep the documentation short, accurate, and useful for the next coding session.

## Acceptance Criteria

This session is complete when:

- The React and TypeScript application is scaffolded.
- The application starts using the documented command.
- The production build passes.
- Type checking and linting are configured and pass.
- The design tokens and fonts are integrated appropriately.
- Light and dark themes work.
- The shared inventory layout is responsive.
- The code structure supports future pages and API integration.
- The API client uses a configurable base URL.
- Verified backend findings are documented.
- No backend files have been changed.
- No full product, sales, or purchase workflows have been implemented.
- Task statuses and documentation reflect the actual state.

## Working Instructions

Start by inspecting the repository and backend. Then explain the implementation plan briefly and proceed with the foundation work.

Do not stop after providing a plan when the next steps are clear.

Ask me only when a decision materially affects correctness or cannot be verified from the available code and documentation.

At the end, report what was built, the commands used to verify it, any failures, and the next recommended task.