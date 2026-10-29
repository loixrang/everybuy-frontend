import { apiFetch } from './client';
import type {
  AuthSession,
  SignInResponse,
  TwoFactorVerifyResponse,
} from '../../types/auth';

const AUTH_BASE = '/api/v1/auth';

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
  await apiFetch<{ status: boolean }>(`${AUTH_BASE}/two-factor/send-otp`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** Verify an emailed two-factor code (`POST /api/v1/auth/two-factor/verify-otp`). */
export async function verifyTwoFactorOtp(
  code: string,
): Promise<TwoFactorVerifyResponse> {
  return await apiFetch<TwoFactorVerifyResponse>(
    `${AUTH_BASE}/two-factor/verify-otp`,
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
  );
}

/** Verify an authenticator-app code (`POST /api/v1/auth/two-factor/verify-totp`). */
export async function verifyTwoFactorTotp(
  code: string,
): Promise<TwoFactorVerifyResponse> {
  return await apiFetch<TwoFactorVerifyResponse>(
    `${AUTH_BASE}/two-factor/verify-totp`,
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
  );
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
