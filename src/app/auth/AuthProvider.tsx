import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type SignInResult,
} from './auth-context';
import {
  fetchSession,
  signInWithEmail,
  signOut as signOutRequest,
  verifyTwoFactorOtp,
  verifyTwoFactorTotp,
} from '../../lib/api/auth';
import { UNAUTHORIZED_EVENT } from '../../lib/api/client';
import {
  isTwoFactorChallenge,
  type AuthUser,
  type TwoFactorMethod,
} from '../../types/auth';

/**
 * Owns the Better Auth session for the app.
 *
 * The backend owns authentication (cookie sessions via `/api/v1/auth`), so no
 * tokens are stored in JavaScript. On mount the provider asks the backend for
 * the current session; a 401 from any later request invalidates local state.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      try {
        const session = await fetchSession();
        if (ignore) return;
        setUser(session?.user ?? null);
        setStatus(session ? 'authenticated' : 'unauthenticated');
      } catch {
        // No session could be read (offline, API down, invalid cookie).
        // Treat the visitor as signed out; the sign-in screen reports the
        // connection problem if they try to submit.
        if (ignore) return;
        setUser(null);
        setStatus('unauthenticated');
      }
    }

    void loadSession();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
      setStatus('unauthenticated');
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      const response = await signInWithEmail(email, password);

      if (isTwoFactorChallenge(response)) {
        return {
          twoFactorRequired: true,
          methods: response.twoFactorMethods ?? [],
        };
      }

      setUser(response.user);
      setStatus('authenticated');
      return { twoFactorRequired: false, methods: [] };
    },
    [],
  );

  const verifyTwoFactor = useCallback(
    async (code: string, method: TwoFactorMethod) => {
      const response =
        method === 'totp'
          ? await verifyTwoFactorTotp(code)
          : await verifyTwoFactorOtp(code);

      setUser(response.user);
      setStatus('authenticated');
    },
    [],
  );

  const signOut = useCallback(async () => {
    await signOutRequest();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, verifyTwoFactor, signOut }),
    [status, user, signIn, verifyTwoFactor, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
