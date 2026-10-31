import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from './Icons';

/** Returns to the in-app history entry, or uses the parent route on direct entry. */
export function BackNavigation({ fallback, label }: { fallback: string; label: string }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => {
        const historyIndex = window.history.state?.idx;
        if (typeof historyIndex === 'number' && historyIndex > 0) navigate(-1);
        else navigate(fallback, { replace: true });
      }}
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[color:var(--color-accent-ink)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
    >
      <ArrowLeftIcon size={16} />
      {label}
    </button>
  );
}
