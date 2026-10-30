# Issues and Backend Follow-ups

This file tracks known backend and product gaps that should stay out of customer-facing copy. The frontend must continue to follow the verified API contract and must not simulate missing behavior.

## Authentication and email

- **Email 2FA delivery errors are hidden:** With the installed Better Auth 1.7.10, `/two-factor/send-otp` can return `{ status: true }` after the email callback fails. The frontend can confirm the request was accepted by the handler, but cannot confirm delivery. The backend should return a failure when delivery fails so the sign-in screen can offer an accurate retry state.
- **OTP values are stored as plaintext:** The current two-factor plugin configuration does not enable hashed OTP storage. Configure Better Auth's supported hashed storage option and verify existing OTP records expire as expected.
- **Email delivery production setup:** Confirm the Resend key and verified sender domain are configured in production. See `docs/API_CONTRACT.md` for the required variable names and sender identity.

## Shop administration

- **Invitation list:** `GET /api/v1/staff/invitations` returns the entire `staff_invitations` table, including already-accepted rows, and answers 404 when the table is empty. It also still returns `tokenHash` even though the hash is not a usable credential. Return only the fields the owner screen needs, expose a status filter (or a dedicated pending-only view), and use an empty array instead of 404. An `accepted` row also blocks a new invitation for the same email through the email unique constraint, which should be handled explicitly.
- **Invitation role:** `POST /api/v1/staff/invite` accepts only `{ name, email }` and always creates a `Staff` account. Accept an optional supported role if owners need to invite a second owner directly.
- **Invitation failure reasons:** preview and accept answer 400 for invalid, expired, already-accepted, and revoked tokens with no distinguishing code, so the recipient sees one "no longer available" message. Return a reason code so the page can explain what happened.
- **Invitation email setup:** invitation email generation depends on the backend preview URL configuration. Set and verify the production `STAFF_INVITE_PREVIEW_URL` (it must point at `<frontend origin>/invite/accept`) so the emailed link works in the deployed frontend.
- **Shop settings initialization:** the frontend can read and update an existing settings row, but there is no operation to create the initial row. Provide a safe initialization path or seed the row during deployment.
- **Staff access safeguards:** the backend does not prevent demoting or deactivating the last owner. Enforce a last-owner safeguard before allowing that role change.
- **Profile management:** there is no verified operation to update the signed-in user's name or email. Add the required secure profile operations before exposing editing controls.

## Activity, records, and list sizes

- **Audit coverage:** Audit records currently cover expense creation only. Extend auditing to the other important staff, stock, and sales actions before presenting the log as a complete activity history.
- **Receipt details:** Stock receipt records do not accept a reference or notes. Add supported fields if the business needs receipt tracking details.
- **Pagination:** Expense, audit, customer, and invitation lists have incomplete or absent pagination support. Add consistent paging before these lists grow beyond a practical size.
- **Customer and sales summaries:** The current API does not provide the directory balance/last-sale summaries or the sales-list summaries/filters described by earlier designs. Add suitable aggregate/query operations if those workflows are needed.

## Notes

- These are engineering follow-ups, not promises about release timing.
- Exact routes, payloads, and observed behavior remain documented in `docs/API_CONTRACT.md`.
- Do not edit the backend as part of frontend work without explicit authorization.
