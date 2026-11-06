import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  PackageIcon,
  ShoppingBagIcon,
  UsersIcon,
  SlidersIcon,
  PlusIcon,
  HistoryIcon,
  WalletIcon,
  ClipboardListIcon,
} from '../ui/Icons';
import { useAuth } from '../../app/auth/auth-context';

/** Desktop-only section navigation, shared by the tabbed and sub-page shells. */
export function DesktopSidebar() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const displayName = user?.name?.trim() || user?.email || 'Signed in';

  const isInventoryActive = pathname.startsWith('/inventory');
  const isMovementsActive = pathname.startsWith('/movements');
  const isStockTakesActive = pathname.startsWith('/stocktakes');
  const isOverviewActive = pathname === '/overview';
  const isSalesActive = pathname.startsWith('/sales');
  const isCustomersActive = pathname.startsWith('/customers');
  const isExpensesActive = pathname.startsWith('/expenses');
  const isAuditActive = pathname.startsWith('/audit');
  const isSettingsActive = pathname.startsWith('/settings');

  return (
    <aside className="hidden lg:flex sticky top-[calc(77px+env(safe-area-inset-top))] h-[calc(100dvh-77px-env(safe-area-inset-top))] self-start overflow-y-auto w-[228px] shrink-0 border-r border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 flex-col justify-between">
      <div className="space-y-6">
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

      <div className="pt-6 border-t border-[color:var(--color-border)] px-3 text-xs space-y-1">
        <div className="font-semibold text-[color:var(--color-quiet)] uppercase tracking-wider text-[10px]">
          Everybuy
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
