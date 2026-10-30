import { ApiError } from './api/client';
import type { StaffInvitation } from '../types/staff';

/**
 * Invitation rules shared by the public acceptance page and its tests.
 *
 * The backend is authoritative for token validity, expiry, acceptance and
 * password rules. These helpers only translate responses into clear UI copy
 * and mirror the verified 12–128 character password rule for immediate
 * feedback. Raw tokens and passwords are never logged or included in copy.
 */

export const INVITATION_MIN_PASSWORD = 12;
export const INVITATION_MAX_PASSWORD = 128;

export type InvitationPreviewFailureKind = 'invalid' | 'server' | 'network';

export interface InvitationPreviewFailure {
  kind: InvitationPreviewFailureKind;
  message: string;
}

export type InvitationDisplayStatus =
  | 'pending'
  | 'processing'
  | 'accepted'
  | 'expired';

export const MISSING_INVITATION_TOKEN_MESSAGE =
  'This invitation link is missing its token. Open the full link from your invitation email, or ask an owner for a new invitation.';

const INVALID_TOKEN_MESSAGE =
  'This invitation is no longer available. It may have expired, already been used, or been replaced. Ask an owner for a new invitation.';

const NETWORK_MESSAGE =
  'We could not reach Everybuy. Check your connection and try again.';

/** Returns a trimmed token, or an empty string when the query parameter is absent. */
export function getInvitationToken(rawToken: string | null | undefined): string {
  return rawToken?.trim() ?? '';
}

/** True when the URL contains a non-empty invitation token. */
export function hasInvitationToken(rawToken: string | null | undefined): boolean {
  return getInvitationToken(rawToken).length > 0;
}

export type InvitationPasswordValidation =
  | { valid: true }
  | { valid: false; message: string };

/**
 * Mirrors the verified backend password rule (12–128 characters) and checks
 * confirmation before a request is sent.
 */
export function validateInvitationPassword(
  password: string,
  confirmation: string,
): InvitationPasswordValidation {
  if (
    password.length < INVITATION_MIN_PASSWORD ||
    password.length > INVITATION_MAX_PASSWORD
  ) {
    return {
      valid: false,
      message: `Choose a password between ${INVITATION_MIN_PASSWORD} and ${INVITATION_MAX_PASSWORD} characters.`,
    };
  }

  if (password !== confirmation) {
    return { valid: false, message: 'The passwords do not match.' };
  }

  return { valid: true };
}

/**
 * Prevents a second submit while the first request is in flight. The page also
 * uses a ref so two events in the same tick cannot both pass this check.
 */
export function isInvitationSubmitBlocked(
  submitting: boolean,
  token: string,
): boolean {
  return submitting || getInvitationToken(token).length === 0;
}

/**
 * Maps preview failures to safe user-facing copy. The backend deliberately
 * answers 400 for invalid, expired, accepted and revoked tokens, so the UI
 * cannot claim a more specific state without inventing one.
 */
export function describeInvitationPreviewError(
  error: unknown,
): InvitationPreviewFailure {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return { kind: 'invalid', message: INVALID_TOKEN_MESSAGE };
    }
    if (error.status === 429) {
      return {
        kind: 'server',
        message: 'Too many invitation checks. Wait a moment and try again.',
      };
    }
    if (error.status >= 500) {
      return {
        kind: 'server',
        message:
          'Everybuy could not check this invitation right now. Try again shortly.',
      };
    }
    return {
      kind: 'server',
      message:
        'We could not check this invitation. Try again, or ask an owner for a new invitation.',
    };
  }

  return { kind: 'network', message: NETWORK_MESSAGE };
}

/**
 * Maps acceptance failures to safe user-facing copy. Backend 409 responses
 * cover both "this email already has an account" and a failed account
 * creation, so the message is chosen without displaying the raw API text.
 */
export function describeInvitationAcceptError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return INVALID_TOKEN_MESSAGE;
    }
    if (error.status === 409) {
      if (/already exists/i.test(error.message)) {
        return 'An account already exists for this email address. Ask an owner for help signing in.';
      }
      return 'Your account could not be created. Try again, or ask an owner to set it up.';
    }
    if (error.status === 429) {
      return 'Too many attempts. Wait a moment and try again.';
    }
    if (error.status >= 500) {
      return 'Your password was received, but account setup did not finish. Contact the shop owner before trying again.';
    }
    return 'Your account could not be created. Try again, or ask an owner for help.';
  }

  return NETWORK_MESSAGE;
}

/**
 * Logs one line of diagnostic context for an unexpected invitation failure.
 * Only the HTTP status and backend message are recorded; tokens, passwords and
 * response bodies are deliberately excluded.
 */
export function logInvitationDiagnostic(action: 'preview' | 'accept', error: unknown): void {
  if (error instanceof ApiError) {
    console.error(`[invitation:${action}] request failed`, {
      status: error.status,
      message: error.message,
    });
    return;
  }

  if (error instanceof Error) {
    console.error(`[invitation:${action}] request failed`, {
      name: error.name,
      message: error.message,
    });
    return;
  }

  console.error(`[invitation:${action}] request failed`);
}

/** Status shown in the owner's pending-invitation list. */
export function invitationStatusOf(
  invitation: Pick<StaffInvitation, 'status' | 'expiresAt' | 'acceptedAt'>,
  now: Date = new Date(),
): InvitationDisplayStatus {
  if (invitation.status === 'accepted' || invitation.acceptedAt) {
    return 'accepted';
  }
  if (invitation.status === 'processing') {
    return 'processing';
  }

  const expiresAt = new Date(invitation.expiresAt).getTime();
  if (Number.isFinite(expiresAt) && expiresAt <= now.getTime()) {
    return 'expired';
  }

  return 'pending';
}

/**
 * True only for invitations that are still waiting to be accepted.
 *
 * `GET /api/v1/staff/invitations` returns every invitation row, including
 * accepted ones, so the owner's "Pending invitations" section filters with
 * this helper: an accepted invitation already produced a team member and an
 * expired one can no longer be accepted, so neither belongs in that list.
 */
export function isPendingInvitation(
  invitation: Pick<StaffInvitation, 'status' | 'expiresAt' | 'acceptedAt'>,
  now: Date = new Date(),
): boolean {
  const status = invitationStatusOf(invitation, now);
  return status === 'pending' || status === 'processing';
}

export function invitationStatusLabel(status: InvitationDisplayStatus): string {
  if (status === 'processing') return 'Processing';
  if (status === 'accepted') return 'Accepted';
  if (status === 'expired') return 'Expired';
  return 'Pending';
}
