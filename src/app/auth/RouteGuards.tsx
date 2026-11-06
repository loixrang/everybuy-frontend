import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';
import { ShoppingBagIcon } from '../../components/ui/Icons';

/** Full-page state shown while the initial session check is in flight. */
export function AuthLoadingScreen() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-[color:var(--color-canvas)] text-[color:var(--color-ink)]">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-[26px] rounded-[6px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] flex items-center justify-center">
          <ShoppingBagIcon size={16} />
        </div>
        <span className="font-extrabold text-2xl tracking-tight">Everybuy</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-[color:var(--color-muted)]" role="status">
        <span
          className="w-4 h-4 rounded-full border-2 border-[color:var(--color-border)] border-t-[color:var(--color-accent)] animate-spin"
          aria-hidden="true"
        />
        Checking your session…
      </div>
    </div>
  );
}

/** Requires an authenticated Better Auth session. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (status === 'unauthenticated') {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}

/**
 * Requires the backend-reported Owner role. Staff are redirected to settings
 * rather than seeing a blank or forbidden page; the backend still enforces
 * authorization on every passkey and 2FA management request.
 */
export function OwnerRoute() {
  const { status, isOwner, roleResolved } = useAuth();
  const location = useLocation();

  if (status === 'loading' || (status === 'authenticated' && !roleResolved)) {
    return <AuthLoadingScreen />;
  }

  if (status === 'unauthenticated') {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (!isOwner) {
    return (
      <Navigate
        to="/settings"
        replace
        state={{ ownerOnly: true }}
      />
    );
  }

  return <Outlet />;
}

/** Keeps signed-in users away from the sign-in screen. */
export function GuestRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/inventory" replace />;
  }

  return <Outlet />;
}
