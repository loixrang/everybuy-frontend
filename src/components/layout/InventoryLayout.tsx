import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
  MoreHorizontalIcon,
  WalletIcon,
  XIcon,
  ClipboardListIcon,
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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  const displayName = user?.name?.trim() || user?.email || 'Signed in';

  const isInventoryActive = location.pathname.startsWith('/inventory');
  const isMovementsActive = location.pathname.startsWith('/movements');
  const isStockTakesActive = location.pathname.startsWith('/stocktakes');
  const isOverviewActive = location.pathname === '/overview';
  const isSalesActive = location.pathname.startsWith('/sales');
  const isCustomersActive = location.pathname.startsWith('/customers');
  const isExpensesActive = location.pathname.startsWith('/expenses');
  const isAuditActive = location.pathname.startsWith('/audit');
  const isSettingsActive = location.pathname.startsWith('/settings');

  // Mobile pages are full-screen scrolls, so every navigation starts at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

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

  // Closing returns focus to the tab that opened the sheet, otherwise the
  // keyboard user is dropped back at the top of the document.
  const closeMore = useCallback(() => {
    setMoreOpen(false);
    moreButtonRef.current?.focus();
  }, []);

  return (
    <div className="min-h-dvh bg-[color:var(--color-canvas)] text-[color:var(--color-ink)] flex flex-col">
      {/* Top sticky header with backdrop blur. Safe-area padding keeps the
          controls clear of notches when `viewport-fit=cover` is active. */}
      <header className="sticky top-0 z-30 backdrop-blur-[16px] bg-[color:var(--color-glass)] border-b border-[color:var(--color-border)] pt-[env(safe-area-inset-top)]">
        <div className="h-16 lg:h-[77px] px-4 sm:px-5 lg:px-12 flex items-center justify-between gap-3">
          {/* Left: Brand */}
          <div className="flex items-center gap-3 min-w-0">
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
            <span className="hidden lg:inline text-xs font-semibold text-[color:var(--color-muted)] pl-4 border-l border-[color:var(--color-border)]">
              Physical store
            </span>
          </div>

          {/* Right: User and theme toggle */}
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
              onClick={() => void handleSignOut()}
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
            onClick={() => setSignOutError(null)}
            className="font-semibold underline underline-offset-2 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace with Desktop Sidebar & Main Content */}
      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        {/* Desktop Sidebar (228px) */}
        <aside className="hidden lg:flex sticky top-[calc(77px+env(safe-area-inset-top))] h-[calc(100vh-77px-env(safe-area-inset-top))] self-start overflow-y-auto w-[228px] shrink-0 border-r border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 flex-col justify-between">
          <div className="space-y-6">
            <div className="px-3 pt-2 text-[11px] font-semibold tracking-wider text-[color:var(--color-muted)] uppercase">
              Physical Store
            </div>
            <nav aria-label="Sections" className="space-y-1">
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
                to="/expenses"
                label="Expenses"
                active={isExpensesActive}
                icon={<WalletIcon size={18} />}
              />
              <SidebarNavLink
                to="/audit"
                label="Audit log"
                active={isAuditActive}
                icon={<HistoryIcon size={18} />}
              />
              <SidebarNavLink
                to="/movements"
                label="Movements"
                active={isMovementsActive}
                icon={<HistoryIcon size={18} />}
              />
              <SidebarNavLink
                to="/stocktakes"
                label="Stocktakes"
                active={isStockTakesActive}
                icon={<ClipboardListIcon size={18} />}
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
        <main className="flex-1 min-w-0 px-4 sm:px-5 py-5 sm:py-6 lg:px-12 lg:py-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation (< 1024px) */}
      <nav
        aria-label="Primary"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 backdrop-blur-[16px] bg-[color:var(--color-glass)] border-t border-[color:var(--color-border)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-16">
          <MobileTab
            to="/inventory"
            label="Stock"
            active={isInventoryActive}
            icon={<PackageIcon size={20} />}
          />
          <MobileTab
            to="/sales"
            label="Sale"
            active={isSalesActive}
            icon={<PlusIcon size={20} />}
          />
          <MobileTab
            to="/customers"
            label="Customers"
            active={isCustomersActive}
            icon={<UsersIcon size={20} />}
          />
          <MobileTab
            to="/overview"
            label="Reports"
            active={isOverviewActive}
            icon={<ShoppingBagIcon size={20} />}
          />
          <MobileTab
            label="More"
            active={
              isMovementsActive ||
              isStockTakesActive ||
              isSettingsActive ||
              isExpensesActive ||
              isAuditActive ||
              moreOpen
            }
            expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
            buttonRef={moreButtonRef}
            icon={<MoreHorizontalIcon size={20} />}
          />
        </div>
      </nav>
      {/* Spacer for the fixed mobile nav, including the safe-area inset */}
      <div className="h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden shrink-0" />

      {moreOpen && (
        <MoreSheet
          onClose={closeMore}
          displayName={displayName}
          email={user?.email}
          showSettings={!isSettingsActive}
          showMovements={!isMovementsActive}
          showStockTakes={!isStockTakesActive}
          showExpenses={!isExpensesActive}
          showAudit={!isAuditActive}
          signingOut={signingOut}
          onSignOut={() => void handleSignOut()}
        />
      )}
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
  icon?: ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
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

function MobileTab({
  to,
  label,
  active,
  icon,
  onClick,
  expanded,
  buttonRef,
}: {
  to?: string;
  label: string;
  active?: boolean;
  icon: ReactNode;
  onClick?: () => void;
  expanded?: boolean;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  const className = `flex flex-col items-center justify-center h-full gap-1 transition-colors ${
    active
      ? 'text-[color:var(--color-accent)] font-semibold'
      : 'text-[color:var(--color-muted)] font-medium hover:text-[color:var(--color-ink)]'
  }`;

  const content = (
    <>
      <span className="shrink-0" aria-hidden="true">
        {icon}
      </span>
      <span className="text-[11px] leading-none">{label}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} aria-current={active ? 'page' : undefined} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      className={className}
    >
      {content}
    </button>
  );
}

/**
 * Bottom sheet for the destinations that do not fit in the tab bar.
 * It is only rendered below `lg` and closes on backdrop, Escape, or navigation.
 */
function MoreSheet({
  onClose,
  displayName,
  email,
  showSettings,
  showMovements,
  showStockTakes,
  showExpenses,
  showAudit,
  signingOut,
  onSignOut,
}: {
  onClose: () => void;
  displayName: string;
  email?: string;
  showSettings: boolean;
  showMovements: boolean;
  showStockTakes: boolean;
  showExpenses: boolean;
  showAudit: boolean;
  signingOut: boolean;
  onSignOut: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      // Keep Tab inside the sheet while it is modal.
      if (event.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    // The sheet disappears at `lg`; closing it there restores body scrolling.
    const desktop = window.matchMedia('(min-width: 1024px)');
    function handleBreakpointChange(event: MediaQueryListEvent) {
      if (event.matches) onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    desktop.addEventListener('change', handleBreakpointChange);
    // Browser back/forward while the sheet is open should dismiss it.
    window.addEventListener('popstate', onClose);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      desktop.removeEventListener('change', handleBreakpointChange);
      window.removeEventListener('popstate', onClose);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 lg:hidden flex items-end">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--color-scrim)] cursor-pointer"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-sheet-title"
        tabIndex={-1}
        className="relative w-full max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-[16px] border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] pb-[env(safe-area-inset-bottom)] focus:outline-none"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
          <h2
            id="more-sheet-title"
            className="text-sm font-bold text-[color:var(--color-ink)]"
          >
            More
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 -mr-2 rounded-[8px] flex items-center justify-center text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-[color:var(--color-ink)] transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="px-5 pb-2">
          <p className="text-sm font-semibold text-[color:var(--color-ink)] truncate">
            {displayName}
          </p>
          {email && (
            <p className="text-xs text-[color:var(--color-muted)] truncate">{email}</p>
          )}
        </div>

        <nav aria-label="More sections" className="px-3 pb-3">
          {showExpenses && (
            <SheetLink
              to="/expenses"
              label="Expenses"
              description="Record and review shop spending"
              icon={<WalletIcon size={18} />}
              onNavigate={onClose}
            />
          )}
          {showAudit && (
            <SheetLink
              to="/audit"
              label="Audit log"
              description="Actions recorded by the backend"
              icon={<HistoryIcon size={18} />}
              onNavigate={onClose}
            />
          )}
          {showMovements && (
            <SheetLink
              to="/movements"
              label="Stock movements"
              description="Receipts, sales and adjustments"
              icon={<HistoryIcon size={18} />}
              onNavigate={onClose}
            />
          )}
          {showStockTakes && (
            <SheetLink
              to="/stocktakes"
              label="Stocktakes"
              description="Count stock and approve differences"
              icon={<ClipboardListIcon size={18} />}
              onNavigate={onClose}
            />
          )}
          {showSettings && (
            <SheetLink
              to="/settings"
              label="Settings"
              description="Profile, shop, appearance and team"
              icon={<SlidersIcon size={18} />}
              onNavigate={onClose}
            />
          )}
        </nav>

        <div className="px-5 pb-5 pt-3 border-t border-[color:var(--color-border)]">
          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            className="w-full h-11 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SheetLink({
  to,
  label,
  description,
  icon,
  onNavigate,
}: {
  to: string;
  label: string;
  description: string;
  icon: ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex items-center gap-3 h-14 px-3 rounded-[8px] hover:bg-[color:var(--color-subtle)] transition-colors"
    >
      <span className="w-9 h-9 shrink-0 rounded-[8px] bg-[color:var(--color-subtle)] text-[color:var(--color-ink)] flex items-center justify-center">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[color:var(--color-ink)] truncate">
          {label}
        </span>
        <span className="block text-xs text-[color:var(--color-muted)] truncate">
          {description}
        </span>
      </span>
    </Link>
  );
}
