import { afterEach, describe, expect, test } from 'bun:test';
import { ApiError } from './client';
import {
  acceptStaffInvitation,
  fetchStaffInvitations,
  inviteStaff,
  previewStaffInvitation,
} from './staff';

const originalFetch = globalThis.fetch;

interface CapturedRequest {
  url: string;
  init?: RequestInit;
}

function mockJson(
  body: unknown,
  status = 200,
): { request: () => CapturedRequest | undefined } {
  let captured: CapturedRequest | undefined;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    captured = { url: String(input), init };
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;

  return { request: () => captured };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('staff invitation API', () => {
  test('previews an invitation with the raw token in the query string', async () => {
    const preview = {
      name: 'Ada Obi',
      email: 'ada@example.com',
      expiresAt: '2026-10-31T12:00:00.000Z',
    };
    const { request } = mockJson(preview);

    await expect(previewStaffInvitation('a'.repeat(64))).resolves.toEqual(preview);

    expect(request()?.url).toBe(
      `http://localhost:3000/api/v1/staff/invite/preview?token=${'a'.repeat(64)}`,
    );
    expect(request()?.init?.method).toBeUndefined();
    expect(request()?.init?.credentials).toBe('include');
  });

  test('surfaces an invalid invitation as an ApiError with status 400', async () => {
    mockJson(
      { message: 'Invitation is invalid, expired, or already used' },
      400,
    );

    const error = await previewStaffInvitation('b'.repeat(64)).catch(
      (err: unknown) => err,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
  });

  test('accepts an invitation with the exact backend body', async () => {
    const result = {
      message: 'Staff account created successfully',
      staff: {
        staffId: 'staff-1',
        userId: 'user-1',
        name: 'Ada Obi',
        email: 'ada@example.com',
        role: 'Staff' as const,
        active: true,
      },
    };
    const { request } = mockJson(result);

    await expect(
      acceptStaffInvitation({ token: 'c'.repeat(64), password: 'long-password' }),
    ).resolves.toEqual(result);

    expect(request()?.url).toBe(
      'http://localhost:3000/api/v1/staff/invite/accept',
    );
    expect(request()?.init?.method).toBe('POST');
    expect(request()?.init?.credentials).toBe('include');
    expect(JSON.parse(String(request()?.init?.body))).toEqual({
      token: 'c'.repeat(64),
      password: 'long-password',
    });
  });

  test('creates an email invitation with the backend fields only', async () => {
    const { request } = mockJson({
      message: 'Staff invitation sent',
      email: 'ada@example.com',
      expiresAt: '2026-10-31T12:00:00.000Z',
    });

    await inviteStaff({ name: 'Ada Obi', email: 'ada@example.com' });

    expect(request()?.url).toBe('http://localhost:3000/api/v1/staff/invite');
    expect(request()?.init?.method).toBe('POST');
    expect(JSON.parse(String(request()?.init?.body))).toEqual({
      name: 'Ada Obi',
      email: 'ada@example.com',
    });
  });

  test('normalises the single-row invitation response', async () => {
    mockJson({
      id: 'invite-1',
      name: 'Ada Obi',
      email: 'ada@example.com',
      status: 'pending',
      createdBy: 'owner-1',
      expiresAt: '2026-10-31T12:00:00.000Z',
      acceptedAt: null,
      createdAt: '2026-10-30T12:00:00.000Z',
    });

    const result = await fetchStaffInvitations();
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('invite-1');
  });

  test('returns an empty list when the backend has no invitation', async () => {
    mockJson(null);
    await expect(fetchStaffInvitations()).resolves.toEqual([]);
  });
});
