import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from './Icons';

type BackNavigationProps = {
  fallback: string | ((pathname: string) => string);
  label: string;
  variant?: 'inline' | 'header';
};

/** Returns to the in-app history entry, or uses the parent route on direct entry. */
export function BackNavigation({
  fallback,
  label,
  variant = 'inline',
}: BackNavigationProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const fallbackPath =
    typeof fallback === 'function' ? fallback(pathname) : fallback;

  function handleBack() {
    const historyIndex = window.history.state?.idx;
    if (typeof historyIndex === 'number' && historyIndex > 0) navigate(-1);
    else navigate(fallbackPath, { replace: true });
  }

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={handleBack}
        aria-label={label}
        title={label}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2 text-sm font-semibold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-subtle)] sm:px-3"
      >
        <ArrowLeftIcon size={18} />
        <span className="hidden max-w-[12rem] truncate sm:inline">{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[color:var(--color-accent-ink)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
    >
      <ArrowLeftIcon size={16} />
      {label}
    </button>
  );
}
