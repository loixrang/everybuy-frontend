import { Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  PackageIcon,
  ShoppingBagIcon,
  MoonIcon,
  SunIcon,
  UsersIcon,
  MenuIcon,
  PlusIcon,
} from '../ui/Icons';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('everybuy-theme') as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function InventoryLayout() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('everybuy-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const isInventoryActive = location.pathname.startsWith('/inventory');
  const isOverviewActive = location.pathname === '/overview';

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
                everyday
              </span>
            </Link>
            <span className="hidden lg:inline text-xs font-semibold text-[color:var(--color-muted)] pl-4 border-l border-[color:var(--color-border)]">
              Physical store · Uyo
            </span>
          </div>

          {/* Right: User and theme toggle */}
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden sm:inline text-sm font-normal text-[color:var(--color-muted)]">
              Staff / Owner
            </span>
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-[8px] flex items-center justify-center border border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-subtle)] text-[color:var(--color-ink)] transition-colors"
              aria-label="Toggle light/dark theme"
            >
              {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
            </button>
          </div>
        </div>
      </header>

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
                icon={<PlusIcon size={18} />}
              />
              <SidebarNavLink
                to="/customers"
                label="Customers"
                icon={<UsersIcon size={18} />}
              />
              <SidebarNavLink
                to="/team"
                label="Team & preferences"
                icon={<MenuIcon size={18} />}
              />
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="pt-6 border-t border-[color:var(--color-border)] px-3 text-xs space-y-1">
            <div className="font-semibold text-[color:var(--color-quiet)] uppercase tracking-wider text-[10px]">
              Everyday / Uyo
            </div>
            <div className="font-semibold text-[color:var(--color-ink)]">Staff / Owner</div>
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
            icon={<PlusIcon size={20} />}
          />
          <MobileNavButton
            to="/customers"
            label="Customers"
            icon={<UsersIcon size={20} />}
          />
          <MobileNavButton
            to="/team"
            label="More"
            icon={<MenuIcon size={20} />}
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
