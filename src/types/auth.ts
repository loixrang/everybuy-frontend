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
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  twoFactorEnabled?: boolean;
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

/** Methods the backend reports for an account that has two-factor enabled. */
export type TwoFactorMethod = 'totp' | 'otp';

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
  twoFactorMethods?: TwoFactorMethod[];
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
