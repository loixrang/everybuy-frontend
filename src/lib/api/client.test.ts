import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { apiFetch, ApiError, UNAUTHORIZED_EVENT } from './client';

const originalFetch = globalThis.fetch;
const originalWindow = (globalThis as { window?: unknown }).window;

type FetchHandler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function mockFetch(handler: FetchHandler) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    return handler(url, init);
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

describe('apiFetch', () => {
  beforeEach(() => {
    mockFetch(() =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });

  test('returns parsed JSON and sends cookies', async () => {
    let seenInit: RequestInit | undefined;
    mockFetch((_url, init) => {
      seenInit = init;
      return new Response(JSON.stringify({ id: 'sale-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const result = await apiFetch<{ id: string }>('/api/v1/sales');
    expect(result).toEqual({ id: 'sale-1' });
    expect(seenInit?.credentials).toBe('include');
  });

  test('adds a JSON content type when a body is present', async () => {
    const seen: { contentType: string | null } = { contentType: null };
    mockFetch((_url, init) => {
      seen.contentType = new Headers(init?.headers).get('content-type');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    await apiFetch('/api/v1/sales', {
      method: 'POST',
      body: JSON.stringify({ hello: 'world' }),
    });

    expect(seen.contentType).toBe('application/json');
  });

  test('throws ApiError with the backend message', async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ message: 'Sale not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        }),
    );

    const error = await apiFetch('/api/v1/sales/unknown').catch((err) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).message).toBe('Sale not found');
  });

  test('falls back to the status text when the body has no message', async () => {
    mockFetch(() => new Response('', { status: 400, statusText: 'Bad Request' }));

    const error = await apiFetch('/api/v1/sales').catch((err) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe('Bad Request');
  });

  test('emits an unauthorized event for expired sessions', async () => {
    const win = new EventTarget();
    (globalThis as { window?: unknown }).window = win;
    let received = 0;
    win.addEventListener(UNAUTHORIZED_EVENT, () => {
      received += 1;
    });
    mockFetch(
      () =>
        new Response(JSON.stringify({ message: 'Authentication required' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await apiFetch('/api/v1/reports/monthly').catch(() => undefined);
    expect(received).toBe(1);
  });

  test('does not emit the unauthorized event for auth endpoints', async () => {
    const win = new EventTarget();
    (globalThis as { window?: unknown }).window = win;
    let received = 0;
    win.addEventListener(UNAUTHORIZED_EVENT, () => {
      received += 1;
    });
    mockFetch(
      () =>
        new Response(JSON.stringify({ message: 'Invalid credentials' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await apiFetch('/api/v1/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.co', password: 'wrong' }),
    }).catch(() => undefined);

    expect(received).toBe(0);
  });
});
