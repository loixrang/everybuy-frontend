import { apiFetch } from './client';
import type {
  AuthSession,
  BackupCodesResponse,
  SignInResponse,
  TOTPEnrollmentResponse,
  TwoFactorVerifyResponse,
} from '../../types/auth';

const AUTH_BASE = '/api/v1/auth';

function requireTwoFactorSession(value: unknown): TwoFactorVerifyResponse {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('user' in value) ||
    typeof value.user !== 'object' ||
    value.user === null ||
    !('id' in value.user) ||
    typeof value.user.id !== 'string' ||
    !('token' in value) ||
    typeof value.token !== 'string'
  ) {
    throw new Error('The authentication server did not confirm the two-factor sign-in.');
  }
  return value as TwoFactorVerifyResponse;
}

/**
 * Read the current Better Auth session.
 * Returns `null` when no valid session cookie is present (the endpoint
 * responds with JSON `null`, not an error).
 */
export async function fetchSession(): Promise<AuthSession | null> {
  const result = await apiFetch<AuthSession | null>(`${AUTH_BASE}/get-session`);
  if (!result || typeof result !== 'object' || !('user' in result)) {
    return null;
  }

  // Some Better Auth versions return `{ session: null, user: null }` instead
  // of `null`; both mean "signed out".
  const candidate = result as Partial<AuthSession>;
  if (!candidate.user || !candidate.session) {
    return null;
  }

  return result;
}

/**
 * Email/password sign-in (`POST /api/v1/auth/sign-in/email`).
 * The response is either a session payload or a two-factor challenge.
 * Cookies are set by the backend on success.
 */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<SignInResponse> {
  return await apiFetch<SignInResponse>(`${AUTH_BASE}/sign-in/email`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Ask Better Auth to send an email verification link
 * (`POST /api/v1/auth/send-verification-email`). Better Auth accepts the
 * email and an optional callbackURL, and returns `{ status: true }` only
 * after the configured mail callback succeeds.
 */
export async function sendVerificationEmail(email: string): Promise<void> {
  const result = await apiFetch<{ status: boolean }>(
    `${AUTH_BASE}/send-verification-email`,
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  );

  if (result.status !== true) {
    throw new Error('The verification email request was not confirmed.');
  }
}

/**
 * Revoke the current session and clear its cookie
 * (`POST /api/v1/auth/sign-out`).
 */
export async function signOut(): Promise<void> {
  await apiFetch<{ success: boolean }>(`${AUTH_BASE}/sign-out`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/**
 * Send an email one-time code for a pending two-factor challenge
 * (`POST /api/v1/auth/two-factor/send-otp`).
 */
export async function sendTwoFactorOtp(): Promise<void> {
  const result = await apiFetch<{ status: boolean }>(`${AUTH_BASE}/two-factor/send-otp`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (result.status !== true) {
    throw new Error('The email code request was not confirmed.');
  }
}

/** Verify an emailed two-factor code (`POST /api/v1/auth/two-factor/verify-otp`). */
export async function verifyTwoFactorOtp(
  code: string,
): Promise<TwoFactorVerifyResponse> {
  const result = await apiFetch<unknown>(
    `${AUTH_BASE}/two-factor/verify-otp`,
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
  );
  return requireTwoFactorSession(result);
}

/** Verify an authenticator-app code (`POST /api/v1/auth/two-factor/verify-totp`). */
export async function verifyTwoFactorTotp(
  code: string,
): Promise<TwoFactorVerifyResponse> {
  const result = await apiFetch<unknown>(
    `${AUTH_BASE}/two-factor/verify-totp`,
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
  );
  return requireTwoFactorSession(result);
}

/** Begin authenticator-app enrollment. Better Auth keeps it pending until a valid TOTP is verified. */
export async function enableTwoFactorTotp(
  password: string,
): Promise<TOTPEnrollmentResponse> {
  const result = await apiFetch<TOTPEnrollmentResponse>(
    `${AUTH_BASE}/two-factor/enable`,
    {
      method: 'POST',
      body: JSON.stringify({ password, method: 'totp', issuer: 'Everybuy' }),
    },
  );
  if (
    result.method !== 'totp' ||
    typeof result.totpURI !== 'string' ||
    !Array.isArray(result.backupCodes) ||
    !result.backupCodes.every((code) => typeof code === 'string')
  ) {
    throw new Error('The API returned an invalid authenticator setup response.');
  }
  return result;
}

/** Disable 2FA; Better Auth requires the active session and current password. */
export async function disableTwoFactor(password: string): Promise<void> {
  const result = await apiFetch<{ status: boolean }>(
    `${AUTH_BASE}/two-factor/disable`,
    { method: 'POST', body: JSON.stringify({ password }) },
  );
  if (result.status !== true) {
    throw new Error('The API did not confirm that two-factor authentication was disabled.');
  }
}

/** Verify a backup code during a pending sign-in challenge or active session. */
export async function verifyTwoFactorBackupCode(
  code: string,
): Promise<TwoFactorVerifyResponse> {
  const result = await apiFetch<unknown>(
    `${AUTH_BASE}/two-factor/verify-backup-code`,
    { method: 'POST', body: JSON.stringify({ code }) },
  );
  return requireTwoFactorSession(result);
}

/** Replace all existing recovery codes. The previous set becomes invalid. */
export async function generateTwoFactorBackupCodes(
  password: string,
): Promise<string[]> {
  const result = await apiFetch<BackupCodesResponse>(
    `${AUTH_BASE}/two-factor/generate-backup-codes`,
    { method: 'POST', body: JSON.stringify({ password }) },
  );
  if (
    result.status !== true ||
    !Array.isArray(result.backupCodes) ||
    !result.backupCodes.every((code) => typeof code === 'string')
  ) {
    throw new Error('The API did not confirm that new backup codes were generated.');
  }
  return result.backupCodes;
}

/**
 * Ask Better Auth to email a password-reset link
 * (`POST /api/v1/auth/request-password-reset`).
 *
 * The backend redirects the email link to `redirectTo` with `?token=…`
 * (or `?error=INVALID_TOKEN` when the token is invalid or expired).
 * The token is valid for one hour.
 */
export async function requestPasswordReset(
  email: string,
  redirectTo: string,
): Promise<void> {
  await apiFetch<{ status: boolean }>(`${AUTH_BASE}/request-password-reset`, {
    method: 'POST',
    body: JSON.stringify({ email, redirectTo }),
  });
}

/**
 * Complete a password reset (`POST /api/v1/auth/reset-password`).
 * The backend revokes existing sessions on success.
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await apiFetch<{ status: boolean }>(`${AUTH_BASE}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}
