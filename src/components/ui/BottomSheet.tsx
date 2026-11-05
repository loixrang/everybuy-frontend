import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from './Icons';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export interface BottomSheetProps {
  /** Sheet heading; also used as the accessible dialog name. */
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Optional fixed footer below the scrollable body. */
  footer?: ReactNode;
  panelClassName?: string;
  /**
   * Return focus to the element that was focused before the sheet opened.
   * Defaults to true so SheetSelect and the customer picker restore their
   * trigger without extra bookkeeping.
   */
  restoreFocus?: boolean;
}

/**
 * Shared bottom-sheet shell used by every dropdown and picker.
 *
 * Owns the portal, backdrop, body scroll lock, focus trap, Escape handling and
 * focus return. Callers provide the fixed header content and the sheet body;
 * content that should scroll inside the 70dvh limit must be a direct flex
 * child with `min-h-0 flex-1 overflow-y-auto`.
 */
export function BottomSheet({
  title,
  onClose,
  children,
  footer,
  panelClassName = '',
  restoreFocus = true,
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!panelRef.current?.contains(document.activeElement)) {
      panelRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const activeElement = document.activeElement;
      const focusIsInside =
        activeElement instanceof Node && panelRef.current.contains(activeElement);

      if (!focusIsInside) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey) {
        if (activeElement === first || activeElement === panelRef.current) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (restoreFocus) previouslyFocused?.focus();
    };
  }, [restoreFocus]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        onClick={onClose}
        className="sheet-backdrop-enter glass-backdrop absolute inset-0 cursor-default"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`sheet-panel-enter glass-panel relative z-10 flex max-h-[70dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[16px] pb-[env(safe-area-inset-bottom)] focus:outline-none ${panelClassName}`}
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-3 mb-1 h-1 w-9 shrink-0 rounded-full bg-[color:var(--color-border)]"
        />

        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3">
          <h2
            id={titleId}
            className="min-w-0 break-words text-lg font-bold text-[color:var(--color-ink)]"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-10 w-10 -mr-2 shrink-0 items-center justify-center rounded-[8px] text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-subtle)] hover:text-[color:var(--color-ink)]"
          >
            <XIcon size={18} />
          </button>
        </div>

        {children}

        {footer ? (
          <div className="shrink-0 border-t border-[color:var(--color-border)] px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
