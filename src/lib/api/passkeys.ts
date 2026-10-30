import type { Passkey } from '@better-auth/passkey/client';
import { authClient } from '../auth-client';
import { passkeyErrorFrom, type PasskeyError, type PasskeyOperation } from '../passkey-errors';
import { UNAUTHORIZED_EVENT } from './client';
import type { AuthUser } from '../../types/auth';

export type { Passkey };

interface BetterAuthErrorShape {
  code?: string;
  message?: string;
  status?: number;
}

/**
 * Normalises a Better Auth failure and records only non-sensitive diagnostic
 * fields: operation, error code, HTTP status, and whether the failure happened
 * in the browser, the network, or the backend.
 */
function fail(operation: PasskeyOperation, error: BetterAuthErrorShape): PasskeyError {
  const normalized = passkeyErrorFrom(error, operation);

  if (operation !== 'sign-in' && normalized.status === 401) {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  }

  console.warn('[passkey] request failed', {
    operation,
    code: normalized.code,
    status: normalized.status,
    source: normalized.source,
  });

  return normalized;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * `POST /api/v1/auth/passkey/list-user-passkeys` via the Better Auth client.
 * The endpoint is session-scoped and returns only the signed-in user's
 * passkeys.
 */
export async function listPasskeys(): Promise<Passkey[]> {
  const result = await authClient.passkey.listUserPasskeys();

  if (result.error) {
    throw fail('list', result.error);
  }
  if (!Array.isArray(result.data)) {
    throw fail('list', {
      code: 'INVALID_RESPONSE',
      message: 'The API returned an invalid passkey list.',
    });
  }
  return result.data;
}

/**
 * Runs the browser's WebAuthn registration ceremony through Better Auth and
 * stores the credential with the owner-chosen name. The backend requires an
 * active owner session for registration.
 */
export async function registerPasskey(name: string): Promise<Passkey> {
  const result = await authClient.passkey.addPasskey({ name });

  if (result.error) {
    throw fail('register', result.error);
  }
  if (!result.data || typeof result.data.id !== 'string') {
    throw fail('register', {
      code: 'INVALID_RESPONSE',
      message: 'The API did not return the registered passkey.',
    });
  }
  return result.data;
}

/** `POST /api/v1/auth/passkey/update-passkey` (owner session required). */
export async function renamePasskey(id: string, name: string): Promise<Passkey> {
  const result = await authClient.passkey.updatePasskey({ id, name });

  if (result.error) {
    throw fail('rename', result.error);
  }
  if (!result.data?.passkey) {
    throw fail('rename', {
      code: 'INVALID_RESPONSE',
      message: 'The API did not confirm the passkey rename.',
    });
  }
  return result.data.passkey;
}

/** `POST /api/v1/auth/passkey/delete-passkey` (owner session required). */
export async function deletePasskey(id: string): Promise<void> {
  const result = await authClient.passkey.deletePasskey({ id });

  if (result.error) {
    throw fail('delete', result.error);
  }
  if (result.data?.status !== true) {
    throw fail('delete', {
      code: 'INVALID_RESPONSE',
      message: 'The API did not confirm the passkey deletion.',
    });
  }
}

export interface PasskeySignInResult {
  user: AuthUser;
  sessionId: string;
}

/**
 * Passwordless sign-in through `POST /api/v1/auth/passkey/verify-authentication`.
 * The backend creates the session cookie itself; no token is stored here.
 * A successful passkey sign-in does not trigger the TOTP challenge.
 */
export async function signInWithPasskey(): Promise<PasskeySignInResult> {
  const result = await authClient.signIn.passkey();

  if (result.error) {
    throw fail('sign-in', result.error);
  }
  const data = result.data;
  if (!data?.user || !data.session) {
    throw fail('sign-in', {
      code: 'INVALID_RESPONSE',
      message: 'The API did not confirm the passkey sign-in.',
    });
  }

  // Better Auth's inferred `User` type omits the two-factor plugin field even
  // though the backend returns the full user row. Narrow it without widening
  // the client type to `any`.
  const twoFactorEnabled =
    'twoFactorEnabled' in data.user &&
    data.user.twoFactorEnabled === true;

  return {
    sessionId: data.session.id,
    user: {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      emailVerified: data.user.emailVerified,
      image: data.user.image ?? null,
      twoFactorEnabled,
      createdAt: toIsoString(data.user.createdAt),
      updatedAt: toIsoString(data.user.updatedAt),
    },
  };
}

/** WebAuthn requires a secure context; localhost is treated as secure. */
export function isPasskeySupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext !== false &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.credentials !== 'undefined'
  );
}

/** Formats Better Auth's `createdAt`, which may arrive as a Date or ISO string. */
export function formatPasskeyDate(value: Date | string | null | undefined): string {
  if (!value) return 'Date unavailable';
  const iso = value instanceof Date ? value.toISOString() : value;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function passkeyDeviceLabel(deviceType: Passkey['deviceType']): string | null {
  if (deviceType === 'multiDevice') return 'Synced across devices';
  if (deviceType === 'singleDevice') return 'This device only';
  return null;
}

export function passkeyBackupLabel(backedUp: Passkey['backedUp']): string | null {
  if (backedUp === true) return 'Backed up';
  if (backedUp === false) return 'Not backed up';
  return null;
}
