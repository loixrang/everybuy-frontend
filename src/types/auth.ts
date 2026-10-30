/**
 * Verified Better Auth shapes for the Everybuy backend.
 *
 * Endpoints (basePath `/api/v1/auth`, verified in better-auth 1.7.x dist):
 * - GET  /get-session            -> `{ session, user }` or `null`
 * - POST /sign-in/email          -> `{ token, user }` or `{ twoFactorRedirect, twoFactorMethods }`
 * - POST /sign-out               -> `{ success }`
 * - POST /two-factor/send-otp    -> `{ status }`
 * - POST /two-factor/verify-otp  -> `{ token, user }`
 * - POST /two-factor/verify-totp -> `{ token, user }`
 * - POST /two-factor/enable     -> TOTP URI and one-time backup codes
 * - POST /two-factor/disable    -> `{ status: true }`
 * - POST /two-factor/verify-backup-code -> `{ token, user }`
 * - POST /two-factor/generate-backup-codes -> one-time backup codes
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionData {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  session: AuthSessionData;
  user: AuthUser;
}

/** Methods the backend reports in its pending login challenge. */
export type TwoFactorLoginMethod = 'totp' | 'otp';

/** UI verification choices; backup codes use a separate endpoint, not a challenge method value. */
export type TwoFactorMethod = TwoFactorLoginMethod | 'backup';

export interface TOTPEnrollmentResponse {
  method: 'totp';
  totpURI: string;
  backupCodes: string[];
}

export interface BackupCodesResponse {
  status: true;
  backupCodes: string[];
}

export interface SignInSuccess {
  token: string;
  user: AuthUser;
  redirect?: boolean;
  url?: string;
}

/**
 * Returned instead of a session when the account has two-factor enabled.
 * No session cookie is issued until a code is verified.
 */
export interface TwoFactorChallenge {
  twoFactorRedirect: true;
  twoFactorMethods?: TwoFactorLoginMethod[];
}

export type SignInResponse = SignInSuccess | TwoFactorChallenge;

export function isTwoFactorChallenge(
  response: SignInResponse,
): response is TwoFactorChallenge {
  return (
    typeof response === 'object' &&
    response !== null &&
    'twoFactorRedirect' in response &&
    response.twoFactorRedirect === true
  );
}

export interface TwoFactorVerifyResponse {
  token: string;
  user: AuthUser;
}
