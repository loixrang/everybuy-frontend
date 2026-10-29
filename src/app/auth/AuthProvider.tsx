import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import { fetchMe } from '../../lib/api/me';
import { UNAUTHORIZED_EVENT } from '../../lib/api/client';
import {
  isTwoFactorChallenge,
  type AuthUser,
  type TwoFactorMethod,
} from '../../types/auth';
import type { Me } from '../../types/me';

/**
 * Owns the Better Auth session for the app.
 *
 * The backend owns authentication (cookie sessions via `/api/v1/auth`), so no
 * tokens are stored in JavaScript. On mount the provider asks the backend for
 * the current session; a 401 from any later request invalidates local state.
 *
 * The staff role comes from `GET /api/v1/me` rather than being guessed from
 * 403 responses. It is loaded after the session is confirmed and cleared on
 * sign-out. `me === null` means the account has no active staff record.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  // Guards against a slow `/me` response for a session that has since ended.
  const sessionUserId = useRef<string | null>(null);

  const loadMe = useCallback(async (expectedUserId: string | null) => {
    if (!expectedUserId) {
      setMe(null);
      return;
    }
    try {
      const profile = await fetchMe();
      if (sessionUserId.current !== expectedUserId) return;
      setMe(profile);
    } catch {
      // A transient `/me` failure must not sign the user out; the layout
      // simply treats the role as unknown until the next refresh.
      if (sessionUserId.current !== expectedUserId) return;
      setMe(null);
    }
  }, []);

  const clearSession = useCallback(() => {
    sessionUserId.current = null;
    setUser(null);
    setMe(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      try {
        const session = await fetchSession();
        if (ignore) return;
        if (!session) {
          clearSession();
          return;
        }
        sessionUserId.current = session.user.id;
        setUser(session.user);
        setStatus('authenticated');
        await loadMe(session.user.id);
      } catch {
        // No session could be read (offline, API down, invalid cookie).
        // Treat the visitor as signed out; the sign-in screen reports the
        // connection problem if they try to submit.
        if (ignore) return;
        clearSession();
      }
    }

    void loadSession();

    return () => {
      ignore = true;
    };
  }, [clearSession, loadMe]);

  useEffect(() => {
    function handleUnauthorized() {
      clearSession();
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [clearSession]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      const response = await signInWithEmail(email, password);

      if (isTwoFactorChallenge(response)) {
        return {
          twoFactorRequired: true,
          methods: response.twoFactorMethods ?? [],
        };
      }

      sessionUserId.current = response.user.id;
      setUser(response.user);
      setStatus('authenticated');
      await loadMe(response.user.id);
      return { twoFactorRequired: false, methods: [] };
    },
    [loadMe],
  );

  const verifyTwoFactor = useCallback(
    async (code: string, method: TwoFactorMethod) => {
      const response =
        method === 'totp'
          ? await verifyTwoFactorTotp(code)
          : await verifyTwoFactorOtp(code);

      sessionUserId.current = response.user.id;
      setUser(response.user);
      setStatus('authenticated');
      await loadMe(response.user.id);
    },
    [loadMe],
  );

  const signOut = useCallback(async () => {
    await signOutRequest();
    clearSession();
  }, [clearSession]);

  const refreshMe = useCallback(async () => {
    await loadMe(sessionUserId.current);
  }, [loadMe]);

  const refreshSession = useCallback(async () => {
    try {
      const session = await fetchSession();
      if (!session) {
        clearSession();
        return;
      }
      sessionUserId.current = session.user.id;
      setUser(session.user);
    } catch {
      // Keep the existing session state; a transient read failure should not
      // sign the user out.
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      me,
      isOwner: me?.role === 'Owner',
      refreshMe,
      refreshSession,
      signIn,
      verifyTwoFactor,
      signOut,
    }),
    [
      status,
      user,
      me,
      refreshMe,
      refreshSession,
      signIn,
      verifyTwoFactor,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
