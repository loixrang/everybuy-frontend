import { ApiError } from './api/client';

function errorCodeOf(error: ApiError): string | null {
  const data = error.data;
  if (typeof data === 'object' && data !== null && 'code' in data) {
    const code = (data as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return null;
}

export function describeTwoFactorError(error: unknown): string {
  if (error instanceof ApiError) {
    const code = errorCodeOf(error);

    if (code === 'INVALID_BACKUP_CODE') {
      return 'That recovery code is invalid or has already been used.';
    }
    if (code === 'BACKUP_CODES_NOT_ENABLED') {
      return 'Recovery codes are not set up for this account. Use another sign-in method.';
    }
    if (code === 'INVALID_TWO_FACTOR_COOKIE') {
      return 'This sign-in attempt expired. Go back and sign in again.';
    }
    if (code === 'OTP_HAS_EXPIRED') {
      return 'That code has expired. Request a new code.';
    }
    if (
      code === 'TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE' ||
      code === 'ACCOUNT_TEMPORARILY_LOCKED' ||
      error.status === 429
    ) {
      return 'Too many verification attempts. Request a new code or try again later.';
    }
    if (code === 'INVALID_CODE' || error.status === 401) {
      return 'That code is not correct. Check it and try again.';
    }
    if (code === 'TOTP_NOT_ENABLED') {
      return 'Authenticator-app codes are not enabled for this account. Use an email code instead.';
    }
    if (code === 'OTP_NOT_CONFIGURED' || code === 'OTP_NOT_ENABLED') {
      return 'Email codes are not available for this account. Use your authenticator app.';
    }
    return error.message || 'Verification failed. Try again.';
  }

  return 'Cannot reach the API server. Check your connection and try again.';
}
