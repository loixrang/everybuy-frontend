import { Link } from 'react-router-dom';
import { LogOutIcon, MoonIcon, ShoppingBagIcon, SunIcon } from '../ui/Icons';
import { BackNavigation } from '../ui/BackNavigation';
import { useAuth } from '../../app/auth/auth-context';
import { useTheme } from '../../lib/hooks/useTheme';

type BackTarget = {
  fallback: string | ((pathname: string) => string);
  label: string;
};

type AppHeaderProps = {
  back?: BackTarget;
  signingOut: boolean;
  signOutError: string | null;
  onSignOut: () => void;
  onDismissSignOutError: () => void;
};

/** Sticky application header, with either the brand or a back button on the left. */
export function AppHeader({
  back,
  signingOut,
  signOutError,
  onSignOut,
  onDismissSignOutError,
}: AppHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const displayName = user?.name?.trim() || user?.email || 'Signed in';

  return (
    <>
      <header className="sticky top-0 z-30 backdrop-blur-[16px] bg-[color:var(--color-glass)] border-b border-[color:var(--color-border)] pt-[env(safe-area-inset-top)]">
        <div className="h-16 lg:h-[77px] px-4 sm:px-5 lg:px-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {back ? (
              <BackNavigation variant="header" fallback={back.fallback} label={back.label} />
            ) : (
              <Link
                to="/inventory"
                className="flex items-center gap-2.5 min-w-0"
                aria-label="Everybuy inventory"
              >
                <div className="w-7 h-[26px] shrink-0 rounded-[6px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] flex items-center justify-center">
                  <ShoppingBagIcon size={16} />
                </div>
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-[color:var(--color-ink)] truncate">
                  Everybuy
                </span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <span
              className="hidden sm:inline max-w-[180px] truncate text-sm font-normal text-[color:var(--color-muted)]"
              title={user?.email}
            >
              {displayName}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="w-11 h-11 lg:w-10 lg:h-10 rounded-[8px] flex items-center justify-center border border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-subtle)] text-[color:var(--color-ink)] transition-colors"
              aria-label={
                theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
              }
            >
              {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
            </button>
            <button
              type="button"
              onClick={onSignOut}
              disabled={signingOut}
              className="w-11 h-11 lg:w-10 lg:h-10 rounded-[8px] flex items-center justify-center border border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-subtle)] text-[color:var(--color-ink)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOutIcon size={18} />
            </button>
          </div>
        </div>
      </header>

      {signOutError && (
        <div
          role="alert"
          className="px-4 sm:px-5 lg:px-12 py-2 flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] text-xs text-[color:var(--color-danger-ink)]"
        >
          <span>{signOutError}</span>
          <button
            type="button"
            onClick={onDismissSignOutError}
            className="font-semibold underline underline-offset-2 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
