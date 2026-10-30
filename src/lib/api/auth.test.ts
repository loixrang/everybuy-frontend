import { afterEach, describe, expect, test } from 'bun:test';
import { ApiError } from './client';
import type { TOTPEnrollmentResponse } from '../../types/auth';
import { isTwoFactorChallenge } from '../../types/auth';
import {
  disableTwoFactor,
  enableTwoFactorTotp,
  generateTwoFactorBackupCodes,
  sendTwoFactorOtp,
  sendVerificationEmail,
  verifyTwoFactorBackupCode,
  verifyTwoFactorOtp,
  verifyTwoFactorTotp,
} from './auth';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('sendVerificationEmail', () => {
  test('posts the email to Better Auth and requires a confirmed response', async () => {
    let request: { url: string; init?: RequestInit } | undefined;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      request = { url: String(input), init };
      return new Response(JSON.stringify({ status: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    await sendVerificationEmail('staff@example.com');

    expect(request?.url).toBe('http://localhost:3000/api/v1/auth/send-verification-email');
    expect(request?.init?.method).toBe('POST');
    expect(request?.init?.credentials).toBe('include');
    expect(JSON.parse(String(request?.init?.body))).toEqual({ email: 'staff@example.com' });
  });

  test('does not treat an unconfirmed response as success', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ status: false }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch;

    await expect(sendVerificationEmail('staff@example.com')).rejects.toThrow(
      'The verification email request was not confirmed.',
    );
  });

  test('propagates Better Auth send failures', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ message: 'Mail unavailable' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch;

    await expect(sendVerificationEmail('staff@example.com')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('Better Auth two-factor API calls', () => {
  test('identifies a pending login challenge separately from an authenticated response', () => {
    expect(isTwoFactorChallenge({
      twoFactorRedirect: true,
      twoFactorMethods: ['totp', 'otp'],
    })).toBe(true);
    expect(isTwoFactorChallenge({
      token: 'opaque',
      user: {
        id: 'u1',
        name: 'Staff',
        email: 'staff@example.com',
        emailVerified: true,
        image: null,
        twoFactorEnabled: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    })).toBe(false);
  });

  test('requests an email OTP and requires a confirmed response', async () => {
    let request: { url: string; init?: RequestInit } | undefined;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      request = { url: String(input), init };
      return new Response(JSON.stringify({ status: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    await sendTwoFactorOtp();

    expect(request?.url).toBe('http://localhost:3000/api/v1/auth/two-factor/send-otp');
    expect(request?.init?.method).toBe('POST');
    expect(request?.init?.credentials).toBe('include');
    expect(JSON.parse(String(request?.init?.body))).toEqual({});
  });

  test('does not claim email OTP request success when the API returns false', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ status: false }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch;

    await expect(sendTwoFactorOtp()).rejects.toThrow('The email code request was not confirmed.');
  });

  test('enables a pending TOTP setup and returns its URI and recovery codes', async () => {
    let request: { url: string; init?: RequestInit } | undefined;
    const result: TOTPEnrollmentResponse = {
      method: 'totp',
      totpURI: 'otpauth://totp/Everybuy:user%40example.com?secret=SAFE',
      backupCodes: ['ABCDE-12345'],
    };
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      request = { url: String(input), init };
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    expect(await enableTwoFactorTotp('current-password')).toEqual(result);
    expect(request?.url).toBe('http://localhost:3000/api/v1/auth/two-factor/enable');
    expect(request?.init?.credentials).toBe('include');
    expect(JSON.parse(String(request?.init?.body))).toEqual({
      password: 'current-password',
      method: 'totp',
      issuer: 'Everybuy',
    });
  });

  test('verifies TOTP, email OTP and recovery codes at their Better Auth routes', async () => {
    const requests: { url: string; body: unknown; credentials: RequestCredentials | undefined }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({
        url: String(input),
        body: JSON.parse(String(init?.body)),
        credentials: init?.credentials,
      });
      return new Response(JSON.stringify({ token: 'opaque', user: { id: 'u1' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    await verifyTwoFactorTotp('123456');
    await verifyTwoFactorOtp('123456');
    await verifyTwoFactorBackupCode('ABCDE-12345');

    expect(requests.map(({ url, body }) => [url, body])).toEqual([
      ['http://localhost:3000/api/v1/auth/two-factor/verify-totp', { code: '123456' }],
      ['http://localhost:3000/api/v1/auth/two-factor/verify-otp', { code: '123456' }],
      ['http://localhost:3000/api/v1/auth/two-factor/verify-backup-code', { code: 'ABCDE-12345' }],
    ]);
    expect(requests.every(({ credentials }) => credentials === 'include')).toBe(true);
  });

  test('does not treat a malformed verification response as an authenticated session', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ status: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch;

    await expect(verifyTwoFactorTotp('123456')).rejects.toThrow(
      'The authentication server did not confirm the two-factor sign-in.',
    );
  });

  test('disables 2FA and replaces recovery codes using password-protected endpoints', async () => {
    const requests: { url: string; body: unknown }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, body: JSON.parse(String(init?.body)) });
      const body = url.endsWith('/disable')
        ? { status: true }
        : { status: true, backupCodes: ['FGHIJ-67890'] };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    await disableTwoFactor('current-password');
    expect(await generateTwoFactorBackupCodes('current-password')).toEqual(['FGHIJ-67890']);
    expect(requests).toEqual([
      {
        url: 'http://localhost:3000/api/v1/auth/two-factor/disable',
        body: { password: 'current-password' },
      },
      {
        url: 'http://localhost:3000/api/v1/auth/two-factor/generate-backup-codes',
        body: { password: 'current-password' },
      },
    ]);
  });
});
