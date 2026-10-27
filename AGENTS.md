# Everybuy Frontend Agent Instructions

## Project

Everybuy is a shop inventory and sales management system.

This repository contains the frontend. The backend is maintained separately at:

C:\Users\loixr\projects\everybuy

The frontend must integrate with the existing backend. Do not change the backend contract to make frontend development easier.

## Technology

- React
- TypeScript
- Vite
- Tailwind CSS
- Bun
- Use the existing dependencies and project conventions where possible.

Do not introduce another framework, package manager, or state management library without a clear reason.

## Required Reading

Before making changes, read:

1. README-AI-PROTOCOL.md
2. session.md
3. docs/CURRENT_TASK.md
4. docs/ROADMAP.md
5. docs/ARCHITECTURE.md
6. docs/API_CONTRACT.md
7. docs/DECISIONS.md
8. design/Everyday_Offline_Design/DEVELOPER_HANDOFF.md
9. design/Everyday_Offline_Design/README.md

Inspect the existing source code before editing it.

## Backend Access

The backend directory is available for inspection:

C:\Users\loixr\projects\everybuy

Treat the backend as read-only unless the user explicitly authorizes changes.

Do not modify backend files, database schemas, migrations, environment files, or configuration without permission.

When implementing an API integration, verify the actual backend implementation first. Check routes, DTOs, response shapes, authentication, cookies, CORS, roles, and permissions.

Never invent endpoints, request properties, response properties, roles, or permissions.

If the backend does not support a required feature, document the limitation. Do not silently add mock behavior and present it as real functionality.

## Design Reference

The complete design reference is located at:

design/Everyday_Offline_Design/

Use the physical inventory designs under:

design/Everyday_Offline_Design/Editable_SVG/inventory/

The online store designs are under:

design/Everyday_Offline_Design/Editable_SVG/store/

The current implementation focuses on the physical inventory application. Do not implement the online store unless the user explicitly adds it to the current task.

Read DEVELOPER_HANDOFF.md and tokens.css before implementing the visual foundation.

Use the supplied SVGs as visual references. Reuse suitable icons and artwork where appropriate.

Do not copy the HTML design viewer itself into the application. The viewer is for inspecting the designs, not the production frontend.

Do not invent a different visual identity when the supplied design already defines the relevant screen.

## Development Rules

- Use TypeScript.
- Avoid any unless there is a clear reason.
- Keep components focused and readable.
- Separate API communication from UI components.
- Reuse components when they reduce meaningful duplication.
- Handle loading, empty, error, and success states.
- Validate user input and display useful error messages.
- Avoid unnecessary dependencies and overengineering.
- Never hardcode secrets or private credentials.
- Vite variables prefixed with VITE_ are public and must not contain secrets.
- Do not use fake data as if it came from the real backend.
- Clearly label temporary mock data and keep it separate from production API logic.
- Do not add features outside the current task.

## Design Rules

Follow the supplied design handoff.

- Use Manrope as the primary font and Inter as the fallback.
- Support light and dark themes.
- Use the design tokens in tokens.css as the source of truth.
- Use a 4 px spacing base and the supplied spacing scale.
- Use consistent borders, corners, typography, and control sizes.
- Use visible keyboard focus and accessible form labels.
- Keep the interface mobile-first and responsive.
- At mobile sizes, prefer record cards over dense tables where specified.
- At desktop sizes, follow the supplied inventory navigation and workspace layout.
- Keep navigation available while scrolling where specified.
- Avoid decorative elements that slow down routine shop work.

Do not replace the supplied design with a generic admin dashboard template.

## Authentication and Permissions

Inspect the existing Better Auth implementation before building authentication.

Do not assume that the frontend should implement its own JWT handling.

Verify the actual session, cookie, CORS, and authentication configuration.

Verify the backend's role and permission rules before creating role-specific UI.

The interface may hide actions the current user cannot perform, but the backend remains responsible for enforcing authorization.

Do not assume Owner and staff have identical permissions.

## API Rules

- Keep API configuration in one appropriate location.
- Use the configured API base URL.
- Avoid scattering raw fetch calls throughout components.
- Use shared request handling where useful.
- Handle HTTP errors and unexpected responses safely.
- Do not claim a request succeeded unless the response confirms success.
- Do not automatically retry non-idempotent operations unless the backend supports safe retries.
- Do not log passwords, session tokens, or other sensitive values.

## Task Management

Use these statuses consistently:

- READY: The task is defined and can be started.
- WORKING: Implementation has started.
- BLOCKED: Progress depends on missing information or another task.
- COMPLETED: Acceptance criteria have been met and required checks pass.

Update docs/CURRENT_TASK.md when the active task changes.

Update docs/ROADMAP.md when a task changes status.

Update docs/CHANGELOG.md when meaningful implementation work is completed.

Update docs/API_CONTRACT.md when an API detail has been verified or changes.

Update docs/ARCHITECTURE.md when the implemented structure changes.

Update docs/DECISIONS.md when an important project decision is made.

Do not mark a task COMPLETED merely because the code was written.

## Working Process

For each task:

1. Read the task and relevant documentation.
2. Inspect the relevant source code and backend implementation.
3. Identify assumptions and missing information.
4. Make the smallest complete implementation that meets the requirements.
5. Run relevant checks.
6. Fix problems introduced by the changes.
7. Update the relevant documentation.
8. Report what changed, what was checked, and anything still blocked.

Do not rewrite unrelated code.

Do not silently skip failing checks.

Do not make large architectural changes without explaining why and asking when the decision requires user approval.

## Definition of Done

A task is complete only when:

- Its acceptance criteria are satisfied.
- The implementation follows the verified backend contract.
- Loading, empty, error, and success states are handled where relevant.
- The interface follows the design reference.
- Relevant type checks, lint checks, tests, and build checks pass.
- Documentation and task statuses are updated.
- Remaining limitations are clearly reported.