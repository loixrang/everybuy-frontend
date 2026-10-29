const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Emitted when a non-auth request is rejected with 401, i.e. the session has
 * expired or was revoked. The auth provider listens for it and sends the user
 * back to the sign-in screen.
 */
export const UNAUTHORIZED_EVENT = 'everybuy:unauthorized';

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // use cookies for Better Auth sessions
  });

  if (!res.ok) {
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      try {
        data = await res.text();
      } catch {
        data = null;
      }
    }
    const message = (typeof data === 'object' && data && 'message' in data && typeof (data as any).message === 'string')
      ? (data as any).message
      : res.statusText || 'Request failed';

    // Auth endpoints legitimately return 401 for bad credentials; only surface
    // expired/revoked sessions from application requests.
    if (
      res.status === 401 &&
      !path.startsWith('/api/v1/auth/') &&
      typeof window !== 'undefined'
    ) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }

    throw new ApiError(message, res.status, data);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  // fallback
  return res.text() as unknown as T;
}

export { API_BASE_URL };
