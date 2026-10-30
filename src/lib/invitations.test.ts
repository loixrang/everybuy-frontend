import { describe, expect, test } from 'bun:test';
import { ApiError } from './api/client';
import {
  describeInvitationAcceptError,
  describeInvitationPreviewError,
  getInvitationToken,
  hasInvitationToken,
  invitationStatusLabel,
  invitationStatusOf,
  isInvitationSubmitBlocked,
  isPendingInvitation,
  validateInvitationPassword,
} from './invitations';

describe('invitation token handling', () => {
  test('reads and trims a token from the query string', () => {
    expect(getInvitationToken('  abc123  ')).toBe('abc123');
  });

  test('treats a missing or blank token as absent', () => {
    expect(hasInvitationToken(null)).toBe(false);
    expect(hasInvitationToken(undefined)).toBe(false);
    expect(hasInvitationToken('')).toBe(false);
    expect(hasInvitationToken('   ')).toBe(false);
    expect(hasInvitationToken('token')).toBe(true);
  });
});

describe('invitation password validation', () => {
  test('accepts a password that meets the backend length rule and matches', () => {
    expect(validateInvitationPassword('a'.repeat(12), 'a'.repeat(12))).toEqual({
      valid: true,
    });
  });

  test('rejects short and overlong passwords', () => {
    expect(validateInvitationPassword('short', 'short')).toEqual({
      valid: false,
      message: 'Choose a password between 12 and 128 characters.',
    });
    expect(validateInvitationPassword('a'.repeat(129), 'a'.repeat(129))).toEqual({
      valid: false,
      message: 'Choose a password between 12 and 128 characters.',
    });
  });

  test('rejects a confirmation mismatch', () => {
    expect(validateInvitationPassword('a'.repeat(12), 'b'.repeat(12))).toEqual({
      valid: false,
      message: 'The passwords do not match.',
    });
  });
});

describe('duplicate submission guard', () => {
  test('blocks a second submit while the first is in flight', () => {
    expect(isInvitationSubmitBlocked(true, 'token')).toBe(true);
    expect(isInvitationSubmitBlocked(false, 'token')).toBe(false);
  });

  test('blocks a submit when the token is missing', () => {
    expect(isInvitationSubmitBlocked(false, '')).toBe(true);
    expect(isInvitationSubmitBlocked(false, '   ')).toBe(true);
  });
});

describe('invitation preview errors', () => {
  test('maps invalid, expired, accepted and revoked tokens to one safe state', () => {
    const result = describeInvitationPreviewError(
      new ApiError('Invitation is invalid, expired, or already used', 400),
    );

    expect(result.kind).toBe('invalid');
    expect(result.message).toContain('no longer available');
    expect(result.message).not.toContain('Invitation is invalid');
  });

  test('maps rate limiting and server errors to retryable states', () => {
    expect(describeInvitationPreviewError(new ApiError('Too many', 429))).toEqual({
      kind: 'server',
      message: 'Too many invitation checks. Wait a moment and try again.',
    });
    expect(describeInvitationPreviewError(new ApiError('Boom', 500)).kind).toBe(
      'server',
    );
  });

  test('maps network failures without exposing internals', () => {
    const result = describeInvitationPreviewError(new TypeError('Failed to fetch'));
    expect(result.kind).toBe('network');
    expect(result.message).toContain('could not reach Everybuy');
    expect(result.message).not.toContain('Failed to fetch');
  });
});

describe('invitation acceptance errors', () => {
  test('maps an invalid token to the unavailable copy', () => {
    expect(
      describeInvitationAcceptError(
        new ApiError('Invitation is invalid, expired, or already used', 400),
      ),
    ).toContain('no longer available');
  });

  test('distinguishes an existing account from a failed creation', () => {
    expect(
      describeInvitationAcceptError(
        new ApiError('Account already exists; Owner assistance required', 409),
      ),
    ).toContain('already exists');

    expect(
      describeInvitationAcceptError(
        new ApiError('Account creation failed; please retry', 409),
      ),
    ).toContain('could not be created');
  });

  test('maps server failures to the incomplete-setup message', () => {
    expect(
      describeInvitationAcceptError(
        new ApiError('Account setup is incomplete; contact the Owner', 500),
      ),
    ).toBe(
      'Your password was received, but account setup did not finish. Contact the shop owner before trying again.',
    );
  });

  test('maps network failures safely', () => {
    expect(describeInvitationAcceptError(new TypeError('Failed to fetch'))).toBe(
      'We could not reach Everybuy. Check your connection and try again.',
    );
  });
});

describe('owner invitation status', () => {
  const future = '2030-01-01T00:00:00.000Z';
  const past = '2020-01-01T00:00:00.000Z';
  const now = new Date('2026-10-30T12:00:00.000Z');

  test('shows pending, processing, accepted and expired states', () => {
    expect(
      invitationStatusOf(
        { status: 'pending', expiresAt: future, acceptedAt: null },
        now,
      ),
    ).toBe('pending');
    expect(
      invitationStatusOf(
        { status: 'processing', expiresAt: future, acceptedAt: null },
        now,
      ),
    ).toBe('processing');
    expect(
      invitationStatusOf(
        { status: 'accepted', expiresAt: future, acceptedAt: future },
        now,
      ),
    ).toBe('accepted');
    expect(
      invitationStatusOf(
        { status: 'pending', expiresAt: past, acceptedAt: null },
        now,
      ),
    ).toBe('expired');
  });

  test('labels every supported status', () => {
    expect(invitationStatusLabel('pending')).toBe('Pending');
    expect(invitationStatusLabel('processing')).toBe('Processing');
    expect(invitationStatusLabel('accepted')).toBe('Accepted');
    expect(invitationStatusLabel('expired')).toBe('Expired');
  });

  test('keeps only invitations that still need accepting', () => {
    expect(
      isPendingInvitation(
        { status: 'pending', expiresAt: future, acceptedAt: null },
        now,
      ),
    ).toBe(true);
    expect(
      isPendingInvitation(
        { status: 'processing', expiresAt: future, acceptedAt: null },
        now,
      ),
    ).toBe(true);
    expect(
      isPendingInvitation(
        { status: 'accepted', expiresAt: future, acceptedAt: future },
        now,
      ),
    ).toBe(false);
    expect(
      isPendingInvitation(
        { status: 'pending', expiresAt: past, acceptedAt: null },
        now,
      ),
    ).toBe(false);
    // A stale pending row past its expiry must not sit in "Pending invitations".
    expect(
      isPendingInvitation(
        { status: 'pending', expiresAt: past, acceptedAt: null },
        new Date('2019-12-31T23:59:59.000Z'),
      ),
    ).toBe(true);
  });
});
