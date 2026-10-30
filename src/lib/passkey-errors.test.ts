import { describe, expect, test } from 'bun:test';
import {
  PasskeyError,
  describePasskeyError,
  describePasskeySignInError,
  isCancelledPasskeyError,
  isUnauthorizedPasskeyError,
  passkeyErrorFrom,
} from './passkey-errors';

describe('passkeyErrorFrom', () => {
  test('classifies WebAuthn cancellation as a client failure', () => {
    const error = passkeyErrorFrom(
      { code: 'AUTH_CANCELLED', status: 400, message: 'cancelled' },
      'sign-in',
    );

    expect(error.source).toBe('client');
    expect(error.code).toBe('AUTH_CANCELLED');
    expect(isCancelledPasskeyError(error)).toBe(true);
    expect(describePasskeySignInError(error)).toBe('Passkey sign-in was cancelled.');
  });

  test('classifies a missing status as a network failure', () => {
    const error = passkeyErrorFrom({ message: 'fetch failed' }, 'list');

    expect(error.status).toBe(0);
    expect(error.source).toBe('network');
    expect(describePasskeyError(error)).toContain('Cannot reach the API server');
  });

  test('classifies backend statuses and session failures', () => {
    const error = passkeyErrorFrom(
      { code: 'SESSION_REQUIRED', status: 401 },
      'list',
    );

    expect(error.source).toBe('server');
    expect(isUnauthorizedPasskeyError(error)).toBe(true);
    expect(describePasskeyError(error)).toContain('session expired');
  });
});

describe('describePasskeyError', () => {
  test('explains previously registered devices', () => {
    const error = new PasskeyError({
      code: 'PREVIOUSLY_REGISTERED',
      status: 400,
      source: 'server',
      message: 'already registered',
    });
    const browserError = new PasskeyError({
      code: 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED',
      status: 400,
      source: 'client',
      message: 'already registered',
    });

    expect(describePasskeyError(error)).toContain('already has a passkey');
    expect(describePasskeyError(browserError)).toContain('already has a passkey');
  });

  test('explains missing passkeys and owner restrictions', () => {
    const missing = new PasskeyError({
      code: 'PASSKEY_NOT_FOUND',
      status: 404,
      source: 'server',
      message: 'not found',
    });
    const forbidden = new PasskeyError({
      code: 'FORBIDDEN',
      status: 403,
      source: 'server',
      message: 'forbidden',
    });

    expect(describePasskeyError(missing)).toContain('no longer exists');
    expect(describePasskeyError(forbidden)).toContain('active owner');
  });

  test('maps cancellation and unsupported browser errors', () => {
    const cancelled = new PasskeyError({
      code: 'REGISTRATION_CANCELLED',
      status: 400,
      source: 'client',
      message: 'cancelled',
    });
    const unsupported = new PasskeyError({
      code: 'NOT_SUPPORTED',
      status: 0,
      source: 'client',
      message: 'unsupported',
    });

    expect(describePasskeyError(cancelled)).toContain('cancelled');
    expect(describePasskeyError(unsupported)).toContain('does not support passkeys');
  });

  test('handles rate limiting and unknown errors without exposing details', () => {
    const limited = new PasskeyError({
      code: 'TOO_MANY_REQUESTS',
      status: 429,
      source: 'server',
      message: 'slow down',
    });

    expect(describePasskeyError(limited)).toContain('Too many passkey requests');
    expect(describePasskeyError(new Error('internal detail'))).toContain(
      'Cannot reach the API server',
    );
  });
});

describe('describePasskeySignInError', () => {
  test('does not treat passkey sign-in as a two-factor challenge', () => {
    const failed = new PasskeyError({
      code: 'AUTHENTICATION_FAILED',
      status: 401,
      source: 'server',
      message: 'failed',
    });

    expect(describePasskeySignInError(failed)).toContain('could not be verified');
  });

  test('reports missing credentials and blocked accounts separately', () => {
    const missing = new PasskeyError({
      code: 'PASSKEY_NOT_FOUND',
      status: 404,
      source: 'server',
      message: 'not found',
    });
    const blocked = new PasskeyError({
      code: 'FORBIDDEN',
      status: 403,
      source: 'server',
      message: 'forbidden',
    });

    expect(describePasskeySignInError(missing)).toContain('No passkey is registered');
    expect(describePasskeySignInError(blocked)).toContain('cannot sign in with a passkey');
  });

  test('reports session-creation failures after a valid passkey', () => {
    const failed = new PasskeyError({
      code: 'UNABLE_TO_CREATE_SESSION',
      status: 500,
      source: 'server',
      message: 'failed',
    });

    expect(describePasskeySignInError(failed)).toContain('could not start a session');
  });

  test('recognises browser DOMException cancellations', () => {
    const error = new DOMException('The operation was aborted.', 'NotAllowedError');

    expect(describePasskeySignInError(error)).toBe('Passkey sign-in was cancelled.');
    expect(describePasskeyError(error)).toContain('cancelled');
  });
});
