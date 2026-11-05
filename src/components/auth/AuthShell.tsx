import type { ReactNode } from 'react';
import { useTheme } from '../../lib/hooks/useTheme';
import { MoonIcon, ShoppingBagIcon, SunIcon } from '../ui/Icons';

/**
 * Shared frame for the public authentication screens: floating theme toggle,
 * brand mark and a centred card. Mirrors the sign-in screen's layout.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-dvh flex flex-col bg-[color:var(--color-canvas)] text-[color:var(--color-ink)]">
      <div className="fixed top-[calc(1.25rem+env(safe-area-inset-top))] right-[calc(1.25rem+env(safe-area-inset-right))] z-10">
        <button
          type="button"
          onClick={toggleTheme}
          className="glass-panel-compact w-10 h-10 rounded-[8px] flex items-center justify-center border border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-subtle)] text-[color:var(--color-ink)] transition-colors"
          aria-label="Toggle light/dark theme"
        >
          {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
        </button>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-16">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-7 h-[26px] rounded-[6px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] flex items-center justify-center">
            <ShoppingBagIcon size={16} />
          </div>
          <span className="font-extrabold text-2xl tracking-tight">Everybuy</span>
        </div>

        <div className="w-full max-w-[440px] rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6">
          {children}
        </div>

        <p className="mt-6 text-xs font-medium text-[color:var(--color-muted)]">
          Everybuy
        </p>
      </main>
    </div>
  );
}
