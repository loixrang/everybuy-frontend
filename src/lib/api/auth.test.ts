import { afterEach, describe, expect, test } from 'bun:test';
import { ApiError } from './client';
import { sendVerificationEmail } from './auth';

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
