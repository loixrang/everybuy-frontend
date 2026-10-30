# Issues and Backend Follow-ups

This file tracks known backend and product gaps that should stay out of customer-facing copy. The frontend must continue to follow the verified API contract and must not simulate missing behavior.

## Authentication and email

- **Email 2FA delivery errors are hidden:** With the installed Better Auth 1.7.10, `/two-factor/send-otp` can return `{ status: true }` after the email callback fails. The frontend can confirm the request was accepted by the handler, but cannot confirm delivery. The backend should return a failure when delivery fails so the sign-in screen can offer an accurate retry state.
- **OTP values are stored as plaintext:** The current two-factor plugin configuration does not enable hashed OTP storage. Configure Better Auth's supported hashed storage option and verify existing OTP records expire as expected.
- **Email delivery production setup:** Confirm the Resend key and verified sender domain are configured in production. See `docs/API_CONTRACT.md` for the required variable names and sender identity.

## Shop administration

- **Pending invitation list:** The current endpoint returns at most one invitation, and an empty invitation table can produce a server error. Return a stable empty list and support listing all pending invitations.
- **Invitation email setup:** Invitation email generation depends on the backend preview URL configuration. Set and verify the production value so the email link works in the deployed frontend.
- **Shop settings initialization:** The frontend can read and update an existing settings row, but there is no operation to create the initial row. Provide a safe initialization path or seed the row during deployment.
- **Staff access safeguards:** The backend does not prevent demoting the last owner. Enforce a last-owner safeguard before allowing that role change.
- **Profile management:** There is no verified operation to update the signed-in user's name or email. Add the required secure profile operations before exposing editing controls.

## Activity, records, and list sizes

- **Audit coverage:** Audit records currently cover expense creation only. Extend auditing to the other important staff, stock, and sales actions before presenting the log as a complete activity history.
- **Receipt details:** Stock receipt records do not accept a reference or notes. Add supported fields if the business needs receipt tracking details.
- **Pagination:** Expense, audit, customer, and invitation lists have incomplete or absent pagination support. Add consistent paging before these lists grow beyond a practical size.
- **Customer and sales summaries:** The current API does not provide the directory balance/last-sale summaries or the sales-list summaries/filters described by earlier designs. Add suitable aggregate/query operations if those workflows are needed.

## Notes

- These are engineering follow-ups, not promises about release timing.
- Exact routes, payloads, and observed behavior remain documented in `docs/API_CONTRACT.md`.
- Do not edit the backend as part of frontend work without explicit authorization.
