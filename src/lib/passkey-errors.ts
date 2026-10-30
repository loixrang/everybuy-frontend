export type PasskeyOperation =
  | 'list'
  | 'register'
  | 'rename'
  | 'delete'
  | 'sign-in';

export type PasskeyFailureSource = 'client' | 'network' | 'server';

export interface PasskeyFailure {
  code: string;
  message: string;
  status: number;
  source: PasskeyFailureSource;
}

/**
 * Normalised Better Auth passkey failure. Better Auth returns `{ data, error }`
 * instead of throwing, and WebAuthn/browser failures use a different shape
 * from backend HTTP failures. This keeps the UI independent of that detail.
 */
export class PasskeyError extends Error {
  readonly code: string;
  readonly status: number;
  readonly source: PasskeyFailureSource;

  constructor(failure: PasskeyFailure) {
    super(failure.message);
    this.name = 'PasskeyError';
    this.code = failure.code;
    this.status = failure.status;
    this.source = failure.source;
  }
}

const CANCELLED_CODES = new Set([
  'AUTH_CANCELLED',
  'REGISTRATION_CANCELLED',
  'ERROR_CEREMONY_ABORTED',
]);

const CLIENT_CODES = new Set([
  ...CANCELLED_CODES,
  'NOT_SUPPORTED',
  'SECURITY_ERROR',
]);

/**
 * Converts the Better Auth error object into a consistent failure. `status: 0`
 * means the request never reached the backend (offline, CORS, or a thrown
 * WebAuthn ceremony error).
 */
export function passkeyErrorFrom(
  error: { code?: string; message?: string; status?: number } | null | undefined,
  operation: PasskeyOperation,
): PasskeyError {
  const status = typeof error?.status === 'number' ? error.status : 0;
  const code =
    error?.code ??
    (status > 0 ? `HTTP_${status}` : 'NETWORK_ERROR');
  const source: PasskeyFailureSource = CLIENT_CODES.has(code)
    ? 'client'
    : status === 0
      ? 'network'
      : 'server';

  return new PasskeyError({
    code,
    status,
    source,
    message:
      error?.message ??
      (source === 'network'
        ? `The ${operation} request could not reach the server.`
        : `The ${operation} request failed.`),
  });
}

function isCancelledName(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'NotAllowedError' ||
      error.name === 'AbortError' ||
      error.name === 'InvalidStateError')
  );
}

function isUnsupportedName(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'NotSupportedError' || error.name === 'SecurityError')
  );
}

export function isCancelledPasskeyError(error: unknown): boolean {
  return (
    (error instanceof PasskeyError && CANCELLED_CODES.has(error.code)) ||
    isCancelledName(error)
  );
}

export function isUnauthorizedPasskeyError(error: unknown): boolean {
  return (
    error instanceof PasskeyError &&
    (error.status === 401 || error.code === 'SESSION_REQUIRED')
  );
}

/** User-facing copy for management operations. Never includes server payloads. */
export function describePasskeyError(error: unknown): string {
  if (error instanceof PasskeyError) {
    if (error.status === 429 || error.code === 'TOO_MANY_REQUESTS') {
      return 'Too many passkey requests. Wait a moment and try again.';
    }
    if (error.code === 'SESSION_REQUIRED' || error.status === 401) {
      return 'Your session expired. Sign in again to manage passkeys.';
    }
    if (error.status === 403) {
      return 'Only an active owner can manage passkeys.';
    }
    if (
      error.code === 'PREVIOUSLY_REGISTERED' ||
      error.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED'
    ) {
      return 'This device already has a passkey for your account. Rename it or use another device.';
    }
    if (error.code === 'PASSKEY_NOT_FOUND' || error.status === 404) {
      return 'That passkey no longer exists. Refresh the list and try again.';
    }
    if (isCancelledPasskeyError(error)) {
      return 'Passkey setup was cancelled. No changes were made.';
    }
    if (error.code === 'NOT_SUPPORTED' || error.code === 'SECURITY_ERROR') {
      return 'This browser or connection does not support passkeys. Use a secure browser and try again.';
    }
    if (error.code === 'FAILED_TO_VERIFY_REGISTRATION') {
      return 'The browser could not complete passkey registration. Try again, or use another device.';
    }
    if (error.code === 'FAILED_TO_UPDATE_PASSKEY') {
      return 'The passkey could not be renamed. Refresh the list and try again.';
    }
    if (error.status >= 500) {
      return 'The server could not complete the passkey request. Try again shortly.';
    }
    if (error.source === 'network') {
      return 'Cannot reach the API server. Check your connection and try again.';
    }
    return 'The passkey change could not be completed. Try again.';
  }

  if (isCancelledName(error)) {
    return 'Passkey setup was cancelled. No changes were made.';
  }
  if (isUnsupportedName(error)) {
    return 'This browser or connection does not support passkeys. Use a secure browser and try again.';
  }
  return 'Cannot reach the API server. Check your connection and try again.';
}

/** User-facing copy for the passwordless sign-in button. */
export function describePasskeySignInError(error: unknown): string {
  if (error instanceof PasskeyError) {
    if (error.status === 429 || error.code === 'TOO_MANY_REQUESTS') {
      return 'Too many sign-in attempts. Wait a moment and try again.';
    }
    if (error.code === 'AUTH_CANCELLED' || isCancelledPasskeyError(error)) {
      return 'Passkey sign-in was cancelled.';
    }
    if (error.code === 'PASSKEY_NOT_FOUND' || error.status === 404) {
      return 'No passkey is registered for this account on this device. Use your email and password.';
    }
    if (error.status === 403) {
      return 'This account cannot sign in with a passkey. Use your email and password.';
    }
    if (error.status === 401 || error.code === 'AUTHENTICATION_FAILED') {
      return 'That passkey could not be verified. Use your email and password, or try another passkey.';
    }
    if (error.code === 'NOT_SUPPORTED' || error.code === 'SECURITY_ERROR') {
      return 'This browser or connection does not support passkeys.';
    }
    if (error.code === 'UNABLE_TO_CREATE_SESSION' || error.status >= 500) {
      return 'The passkey was accepted, but the server could not start a session. Try again shortly.';
    }
    if (error.source === 'network') {
      return 'Cannot reach the API server. Check your connection and try again.';
    }
    return 'Passkey sign-in failed. Use your email and password.';
  }

  if (isCancelledName(error)) {
    return 'Passkey sign-in was cancelled.';
  }
  if (isUnsupportedName(error)) {
    return 'This browser or connection does not support passkeys.';
  }
  return 'Cannot reach the API server. Check your connection and try again.';
}
