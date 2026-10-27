import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('everybuy-theme') as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export function InventoryLayout() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('everybuy-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

  return (
    <div className="min-h-full bg-[color:var(--color-canvas)] text-[color:var(--color-ink)]">
      <header className="sticky top-0 z-10 backdrop-blur-[16px] bg-[color:var(--color-glass)] border-b border-[color:var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[8px] bg-[color:var(--color-accent)]" />
            <span className="font-semibold">Everybuy</span>
          </div>
          <button
            onClick={toggleTheme}
            className="h-9 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-subtle)] text-sm"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 flex gap-6">
        <aside className="hidden lg:block w-[228px] shrink-0">
          <nav className="sticky top-20 space-y-1">
            <NavItem label="Overview" href="/overview" active />
            <NavItem label="Inventory" href="#" />
            <NavItem label="Sales" href="#" />
            <NavItem label="Purchases" href="#" />
            <NavItem label="Customers" href="#" />
            <NavItem label="Team" href="#" />
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-glass)] backdrop-blur-[16px]">
        <div className="grid grid-cols-5">
          <MobileNavItem label="Overview" />
          <MobileNavItem label="Inventory" />
          <MobileNavItem label="Sales" />
          <MobileNavItem label="Purchases" />
          <MobileNavItem label="More" />
        </div>
      </nav>
      <div className="h-16 lg:hidden" />
    </div>
  )
}

function NavItem({ label, href, active }: { label: string; href: string; active?: boolean }) {
  return (
    <a
      href={href}
      className={`block px-3 py-2 rounded-[8px] text-sm ${
        active
          ? 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)]'
          : 'hover:bg-[color:var(--color-subtle)]'
      }`}
    >
      {label}
    </a>
  )
}

function MobileNavItem({ label }: { label: string }) {
  return (
    <button className="flex flex-col items-center justify-center h-14 text-xs">
      <span>{label}</span>
    </button>
  )
}
