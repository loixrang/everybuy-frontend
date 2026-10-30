import { describe, expect, test } from 'bun:test';
import { ApiError } from './api/client';
import { describeTwoFactorError } from './auth-errors';

describe('describeTwoFactorError', () => {
  test('distinguishes an expired challenge from an invalid code', () => {
    expect(describeTwoFactorError(new ApiError('Expired challenge', 401, {
      code: 'INVALID_TWO_FACTOR_COOKIE',
    }))).toContain('sign-in attempt expired');
    expect(describeTwoFactorError(new ApiError('Invalid code', 401, {
      code: 'INVALID_CODE',
    }))).toContain('code is not correct');
  });

  test('explains expired OTPs, exhausted attempts, and used backup codes', () => {
    expect(describeTwoFactorError(new ApiError('Expired', 400, {
      code: 'OTP_HAS_EXPIRED',
    }))).toContain('code has expired');
    expect(describeTwoFactorError(new ApiError('Locked', 429, {
      code: 'ACCOUNT_TEMPORARILY_LOCKED',
    }))).toContain('Too many verification attempts');
    expect(describeTwoFactorError(new ApiError('Used', 401, {
      code: 'INVALID_BACKUP_CODE',
    }))).toContain('already been used');
  });

  test('returns a connection error for a failed request', () => {
    expect(describeTwoFactorError(new TypeError('fetch failed'))).toContain(
      'Cannot reach the API server',
    );
  });
});
