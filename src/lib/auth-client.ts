import { createAuthClient } from 'better-auth/react';
import { passkeyClient } from '@better-auth/passkey/client';
import { API_BASE_URL } from './api/client';

/**
 * Better Auth browser client for the endpoints mounted under
 * `/api/v1/auth` by the Everybuy backend.
 *
 * The session stays in the backend's HttpOnly-style cookie; the client never
 * receives or stores it in localStorage. Passkey WebAuthn calls need the
 * browser client because the challenge/response ceremony happens locally.
 */
export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  basePath: '/api/v1/auth',
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [passkeyClient()],
});
