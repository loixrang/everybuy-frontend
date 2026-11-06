import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/auth/auth-context';
import { ApiError } from '../api/client';

/** Shared sign-out state for the authenticated layouts. */
export function useSignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const signingOutRef = useRef(false);

  const handleSignOut = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    setSigningOut(true);
    setSignOutError(null);

    try {
      await signOut();
      navigate('/signin', { replace: true });
    } catch (err: unknown) {
      setSignOutError(
        err instanceof ApiError
          ? err.message
          : 'Unable to sign out. Check your connection and try again.',
      );
    } finally {
      signingOutRef.current = false;
      setSigningOut(false);
    }
  }, [navigate, signOut]);

  const clearSignOutError = useCallback(() => setSignOutError(null), []);

  return { signingOut, signOutError, clearSignOutError, signOut: handleSignOut };
}
