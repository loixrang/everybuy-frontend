import { useEffect, useId, useRef, type ReactNode } from 'react';
import { XIcon } from './Icons';

interface ConfirmDialogProps {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  busy?: boolean;
  tone?: 'danger' | 'default';
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared confirmation dialog for destructive security actions. It behaves as
 * a bottom sheet on phones and a centred card on larger screens, matching the
 * existing settings dialogs. Sensitive values belong in transient form state,
 * never in this component's props beyond the current render.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  busyLabel = 'Working…',
  busy = false,
  tone = 'danger',
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const first =
      panelRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      ) ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    return () => {
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={() => {
          if (!busy) onCancel();
        }}
        className="absolute inset-0 cursor-pointer bg-[color:var(--color-scrim)]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-[480px] sm:rounded-[12px] sm:p-6 sm:pb-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={titleId}
              className="text-lg font-bold text-[color:var(--color-ink)]"
            >
              {title}
            </h2>
            <div
              id={descriptionId}
              className="mt-1 space-y-2 text-xs text-[color:var(--color-muted)]"
            >
              {description}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-subtle)] hover:text-[color:var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-9"
          >
            <XIcon size={18} />
          </button>
        </div>

        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && !confirmDisabled) onConfirm();
          }}
        >
          {children}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="h-11 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-sm font-semibold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || confirmDisabled}
              className={`h-11 rounded-[8px] px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                tone === 'danger'
                  ? 'border border-[color:var(--color-danger-ink)] text-[color:var(--color-danger-ink)] hover:bg-[color:var(--color-danger-bg)]'
                  : 'bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)]'
              }`}
            >
              {busy ? busyLabel : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
