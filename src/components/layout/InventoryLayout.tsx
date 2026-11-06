import { Outlet, Link, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  PackageIcon,
  ShoppingBagIcon,
  UsersIcon,
  SlidersIcon,
  PlusIcon,
  HistoryIcon,
  MoreHorizontalIcon,
  WalletIcon,
  XIcon,
  ClipboardListIcon,
} from '../ui/Icons';
import { useAuth } from '../../app/auth/auth-context';
import { useSignOut } from '../../lib/hooks/useSignOut';
import { AppHeader } from './AppHeader';
import { DesktopSidebar } from './DesktopSidebar';

export function InventoryLayout() {
  const { user } = useAuth();
  const { signingOut, signOutError, clearSignOutError, signOut } = useSignOut();
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

  // Closing returns focus to the tab that opened the sheet, otherwise the
  // keyboard user is dropped back at the top of the document.
  const closeMore = useCallback(() => {
    setMoreOpen(false);
    moreButtonRef.current?.focus();
  }, []);

  return (
    <div className="min-h-dvh bg-[color:var(--color-canvas)] text-[color:var(--color-ink)] flex flex-col">
      <AppHeader
        signingOut={signingOut}
        signOutError={signOutError}
        onSignOut={() => void signOut()}
        onDismissSignOutError={clearSignOutError}
      />

      {/* Main Workspace with Desktop Sidebar & Main Content */}
      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        <DesktopSidebar />

        {/* Workspace Content. The bottom padding clears the fixed tab bar so
            the last field on a long screen is never hidden behind it. */}
        <main className="flex-1 min-w-0 px-4 sm:px-5 pt-5 sm:pt-6 lg:px-12 lg:pt-8 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation (< 1024px) */}
      <nav
        aria-label="Primary"
        className="bottom-nav lg:hidden fixed bottom-0 inset-x-0 z-30 backdrop-blur-[16px] bg-[color:var(--color-glass)] border-t border-[color:var(--color-border)]"
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
          onSignOut={() => void signOut()}
        />
      )}
    </div>
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
        className="absolute inset-0 glass-backdrop cursor-pointer"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-sheet-title"
        tabIndex={-1}
        className="glass-panel relative w-full max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-[16px] pb-[env(safe-area-inset-bottom)] focus:outline-none"
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
              description="A record of important shop changes"
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
