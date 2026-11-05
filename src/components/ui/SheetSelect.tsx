import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { BottomSheet } from './BottomSheet';
import { CheckIcon, ChevronDownIcon, SearchIcon } from './Icons';
import { matchesSearch } from '../../lib/utils/search';

export interface SheetSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  leading?: ReactNode;
  disabled?: boolean;
}

export interface SheetSelectProps {
  /** Field label. Used as the sheet title. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SheetSelectOption[];
  placeholder?: string;
  /** Accessible name for icon-only or unlabelled triggers. */
  ariaLabel?: string;
  /** Override the automatic 8-option search threshold. */
  searchable?: boolean;
  /** Search field placeholder; defaults to "Search <label>". */
  searchPlaceholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  triggerClassName?: string;
}

const SEARCH_THRESHOLD = 8;

/**
 * Controlled dropdown that opens the shared bottom sheet.
 *
 * The trigger keeps the same string value contract as the native select it
 * replaces, so callers' form state and payloads do not change. Lists with
 * roughly 8+ options get a search field using the shared matchesSearch helper;
 * shorter lists stay at their natural height without one.
 */
export function SheetSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  ariaLabel,
  searchable,
  searchPlaceholder,
  disabled = false,
  invalid = false,
  required = false,
  id,
  className = 'w-full',
  triggerClassName = '',
}: SheetSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  const canSearch = searchable ?? options.length >= SEARCH_THRESHOLD;

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div className={className}>
      <button
        type="button"
        id={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`flex min-h-12 w-full items-center gap-3 rounded-[8px] border bg-[color:var(--color-surface)] px-3.5 py-2 text-left transition-colors hover:bg-[color:var(--color-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none disabled:cursor-not-allowed disabled:bg-[color:var(--color-subtle)] disabled:text-[color:var(--color-quiet)] ${
          invalid
            ? 'border-[color:var(--color-danger-ink)]'
            : 'border-[color:var(--color-border)]'
        } ${triggerClassName}`}
      >
        <span
          className={`min-w-0 flex-1 truncate text-[15px] ${
            selected
              ? 'font-medium text-[color:var(--color-ink)]'
              : 'text-[color:var(--color-muted)]'
          } ${disabled ? 'text-[color:var(--color-quiet)]' : ''}`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon
          size={18}
          aria-hidden="true"
          className="shrink-0 text-[color:var(--color-muted)]"
        />
      </button>

      {open ? (
        <BottomSheet title={label} onClose={() => setOpen(false)}>
          <SheetSelectBody
            options={options}
            value={value}
            canSearch={canSearch}
            searchLabel={label}
            searchPlaceholder={
              searchPlaceholder ?? `Search ${label.toLowerCase()}`
            }
            onChoose={choose}
          />
        </BottomSheet>
      ) : null}
    </div>
  );
}

interface SheetSelectBodyProps {
  options: SheetSelectOption[];
  value: string;
  canSearch: boolean;
  searchLabel: string;
  searchPlaceholder: string;
  onChoose: (value: string) => void;
}

function SheetSelectBody({
  options,
  value,
  canSearch,
  searchLabel,
  searchPlaceholder,
  onChoose,
}: SheetSelectBodyProps) {
  const [search, setSearch] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const listLabelId = useId();

  const filteredOptions = canSearch
    ? options.filter((option) =>
        matchesSearch(
          [option.label, option.sublabel ?? ''].join(' '),
          search,
        ),
      )
    : options;

  // Start keyboard users on the selected row (without focusing the search
  // field), so arrow keys and Enter work immediately.
  useEffect(() => {
    const selectedOption =
      listRef.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
    const firstOption =
      listRef.current?.querySelector<HTMLElement>('[role="option"]');
    (selectedOption ?? firstOption)?.focus();
  }, []);

  function handleListKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>(
        '[role="option"]:not([disabled])',
      ) ?? [],
    );
    if (items.length === 0) return;

    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    let nextIndex = 0;
    if (event.key === 'End') {
      nextIndex = items.length - 1;
    } else if (event.key === 'ArrowUp') {
      nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
    } else if (event.key === 'ArrowDown') {
      nextIndex = currentIndex === -1 || currentIndex === items.length - 1 ? 0 : currentIndex + 1;
    }

    items[nextIndex]?.focus();
  }

  return (
    <>
      {canSearch ? (
        <div className="shrink-0 px-5 pb-3">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[color:var(--color-muted)]">
              <SearchIcon size={18} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              autoComplete="off"
              className="h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] pl-10 pr-3 text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </div>
        </div>
      ) : null}

      {filteredOptions.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[color:var(--color-muted)]">
          No match.
        </p>
      ) : (
        <div
          ref={listRef}
          role="listbox"
          aria-labelledby={listLabelId}
          onKeyDown={handleListKeyDown}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <span id={listLabelId} className="sr-only">
            {searchLabel}
          </span>
          {filteredOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onClick={() => onChoose(option.value)}
                className={`flex min-h-[52px] w-full items-center gap-3 border-b border-[color:var(--color-border)] px-5 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[color:var(--color-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected ? 'bg-[color:var(--color-subtle)]' : ''
                }`}
              >
                {option.leading ? (
                  <span className="shrink-0" aria-hidden="true">
                    {option.leading}
                  </span>
                ) : null}

                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[15px] leading-snug text-[color:var(--color-ink)] ${
                      isSelected ? 'font-medium' : 'font-normal'
                    }`}
                  >
                    {option.label}
                  </span>
                  {option.sublabel ? (
                    <span className="mt-0.5 block truncate text-[13px] leading-snug text-[color:var(--color-muted)]">
                      {option.sublabel}
                    </span>
                  ) : null}
                </span>

                {isSelected ? (
                  <CheckIcon
                    size={20}
                    aria-hidden="true"
                    className="shrink-0 text-[color:var(--color-accent)]"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
