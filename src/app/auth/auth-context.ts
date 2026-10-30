import { createContext, useContext } from 'react';
import type { AuthUser, TwoFactorLoginMethod, TwoFactorMethod } from '../../types/auth';
import type { Me } from '../../types/me';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SignInResult {
  twoFactorRequired: boolean;
  methods: TwoFactorLoginMethod[];
}

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /**
   * Staff profile from GET /api/v1/me. `null` while loading or when the
   * signed-in user has no active staff record.
   */
  me: Me | null;
  /** True only when the backend reports the Owner role. */
  isOwner: boolean;
  /**
   * True once the role lookup has finished (successfully or not). Owner-only
   * routes wait for this so staff are never briefly treated as owners.
   */
  roleResolved: boolean;
  /** Re-reads `/me`, e.g. after changing the display name. */
  refreshMe: () => Promise<void>;
  /** Re-reads the Better Auth session (e.g. after the profile name changes). */
  refreshSession: () => Promise<void>;
  /** Throws `ApiError` on failure; state is only updated after the backend confirms. */
  signIn: (email: string, password: string) => Promise<SignInResult>;
  /** Completes a pending two-factor challenge and establishes the session. */
  verifyTwoFactor: (code: string, method: TwoFactorMethod) => Promise<void>;
  /**
   * Runs the browser passkey ceremony and adopts the session the backend
   * creates. Throws `PasskeyError` on failure; no token is stored.
   */
  signInWithPasskey: () => Promise<void>;
  /** Revokes the session on the backend, then clears local state. */
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
