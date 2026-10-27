# AI Development Protocol

This file defines how AI coding sessions should work in the Everybuy frontend repository.

## Before Every Session

Read:

1. AGENTS.md
2. session.md
3. docs/CURRENT_TASK.md
4. Relevant sections of docs/ROADMAP.md
5. Relevant architecture, API, and design documentation

Inspect the current source code before making changes.

Do not assume the repository is in the same state as the previous session.

## Session Rules

- Work on the current task unless the user changes it.
- Do not implement future roadmap tasks early.
- Do not modify the backend without explicit permission.
- Do not invent API behavior.
- Do not replace the supplied design with a different design.
- Do not add dependencies without a clear reason.
- Ask the user when an important decision cannot be verified.
- Continue independently when the next step is clear and safe.
- Avoid asking questions whose answers are already in the repository.

## Task Completion

Before finishing a task:

1. Check every acceptance criterion.
2. Run the relevant available checks.
3. Fix issues caused by the implementation.
4. Update the task status.
5. Update relevant documentation.
6. Summarize the files changed.
7. Report checks that passed or failed.
8. State any remaining blockers.

## Reporting Format

At the end of a session, report:

- Status
- What was implemented
- Important files changed
- Checks performed and their results
- Decisions made
- Remaining issues
- Suggested next task

Be direct and use simple language.

Do not claim that tests, builds, or other checks passed unless they were actually run.

## Important

The design files are references for the real application, not a working backend.

The HTML viewers demonstrate predefined navigation and sample states. They do not implement real authentication, inventory, sales, or purchases.

Use the backend as the source of truth for application behavior.