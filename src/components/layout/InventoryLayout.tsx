import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  PackageIcon,
  ShoppingBagIcon,
  MoonIcon,
  SunIcon,
  UsersIcon,
  SlidersIcon,
  PlusIcon,
  HistoryIcon,
  LogOutIcon,
} from '../ui/Icons';
import { useAuth } from '../../app/auth/auth-context';
import { ApiError } from '../../lib/api/client';
import { useTheme } from '../../lib/hooks/useTheme';

export function InventoryLayout() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const location = useLocation();

  const displayName = user?.name?.trim() || user?.email || 'Signed in';

  const isInventoryActive = location.pathname.startsWith('/inventory');
  const isMovementsActive = location.pathname.startsWith('/movements');
  const isOverviewActive = location.pathname === '/overview';
  const isSalesActive = location.pathname.startsWith('/sales');
  const isCustomersActive = location.pathname.startsWith('/customers');
  const isSettingsActive = location.pathname.startsWith('/settings');

  async function handleSignOut() {
    if (signingOut) return;
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
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-canvas)] text-[color:var(--color-ink)] flex flex-col">
      {/* Top sticky header with backdrop blur */}
      <header className="sticky top-0 z-30 h-[77px] backdrop-blur-[16px] bg-[color:var(--color-glass)] border-b border-[color:var(--color-border)]">
        <div className="h-full px-5 lg:px-12 flex items-center justify-between">
          {/* Left: Brand/Store location */}
          <div className="flex items-center gap-3">
            <Link to="/inventory" className="flex items-center gap-2.5">
              <div className="w-7 h-[26px] rounded-[6px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] flex items-center justify-center">
                <ShoppingBagIcon size={16} />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-[color:var(--color-ink)]">
                Everybuy
              </span>
            </Link>
            <span className="hidden lg:inline text-xs font-semibold text-[color:var(--color-muted)] pl-4 border-l border-[color:var(--color-border)]">
              Physical store
            </span>
          </div>

          {/* Right: User and theme toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className="hidden sm:inline max-w-[180px] truncate text-sm font-normal text-[color:var(--color-muted)]"
              title={user?.email}
            >
              {displayName}
            </span>
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-[8px] flex items-center justify-center border border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-subtle)] text-[color:var(--color-ink)] transition-colors"
              aria-label="Toggle light/dark theme"
            >
              {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
            </button>
            <button
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="w-10 h-10 rounded-[8px] flex items-center justify-center border border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-subtle)] text-[color:var(--color-ink)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
          className="px-5 lg:px-12 py-2 flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] text-xs text-[color:var(--color-danger-ink)]"
        >
          <span>{signOutError}</span>
          <button
            type="button"
            onClick={() => setSignOutError(null)}
            className="font-semibold underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace with Desktop Sidebar & Main Content */}
      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        {/* Desktop Sidebar (228px) */}
        <aside className="hidden lg:block w-[228px] shrink-0 border-r border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="px-3 pt-2 text-[11px] font-semibold tracking-wider text-[color:var(--color-muted)] uppercase">
              Physical Store
            </div>
            <nav className="space-y-1">
              <SidebarNavLink
                to="/inventory"
                label="Inventory"
                active={isInventoryActive}
                icon={<PackageIcon size={18} />}
              />
              <SidebarNavLink
                to="/overview"
                label="Overview"
                active={isOverviewActive}
                icon={<ShoppingBagIcon size={18} />}
              />
              <SidebarNavLink
                to="/sales"
                label="Sales"
                active={isSalesActive}
                icon={<PlusIcon size={18} />}
              />
              <SidebarNavLink
                to="/customers"
                label="Customers"
                active={isCustomersActive}
                icon={<UsersIcon size={18} />}
              />
              <SidebarNavLink
                to="/movements"
                label="Movements"
                active={isMovementsActive}
                icon={<HistoryIcon size={18} />}
              />
              <SidebarNavLink
                to="/settings"
                label="Settings"
                active={isSettingsActive}
                icon={<SlidersIcon size={18} />}
              />
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="pt-6 border-t border-[color:var(--color-border)] px-3 text-xs space-y-1">
            <div className="font-semibold text-[color:var(--color-quiet)] uppercase tracking-wider text-[10px]">
              Everybuy / Physical store
            </div>
            <div
              className="font-semibold text-[color:var(--color-ink)] truncate"
              title={displayName}
            >
              {displayName}
            </div>
            {user?.name && user.email && (
              <div
                className="text-[color:var(--color-muted)] truncate"
                title={user.email}
              >
                {user.email}
              </div>
            )}
          </div>
        </aside>

        {/* Workspace Content */}
        <main className="flex-1 min-w-0 px-5 py-6 lg:px-12 lg:py-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation (< 1024px) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-[68px] backdrop-blur-[16px] bg-[color:var(--color-glass)] border-t border-[color:var(--color-border)]">
        <div className="grid grid-cols-4 h-full">
          <MobileNavButton
            to="/inventory"
            label="Stock"
            active={isInventoryActive}
            icon={<PackageIcon size={20} />}
          />
          <MobileNavButton
            to="/sales"
            label="Sale"
            active={isSalesActive}
            icon={<PlusIcon size={20} />}
          />
          <MobileNavButton
            to="/customers"
            label="Customers"
            active={isCustomersActive}
            icon={<UsersIcon size={20} />}
          />
          <MobileNavButton
            to="/settings"
            label="More"
            active={isSettingsActive}
            icon={<SlidersIcon size={20} />}
          />
        </div>
      </nav>
      {/* Spacer for mobile bottom nav */}
      <div className="h-[68px] lg:hidden shrink-0" />
    </div>
  );
}

function SidebarNavLink({
  to,
  label,
  active,
  icon,
}: {
  to: string;
  label: string;
  active?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 h-11 rounded-[8px] text-sm font-semibold transition-colors ${
        active
          ? 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)]'
          : 'text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-[color:var(--color-ink)]'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function MobileNavButton({
  to,
  label,
  active,
  icon,
}: {
  to: string;
  label: string;
  active?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center h-full transition-colors ${
        active
          ? 'text-[color:var(--color-accent)] font-semibold'
          : 'text-[color:var(--color-muted)] font-medium hover:text-[color:var(--color-ink)]'
      }`}
    >
      <div className="shrink-0">{icon}</div>
      <span className="text-[11px] mt-1">{label}</span>
    </Link>
  );
}
