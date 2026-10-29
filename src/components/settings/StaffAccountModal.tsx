import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../lib/api/client';
import { createStaffAccount, inviteStaff } from '../../lib/api/staff';
import type { CreatedStaff } from '../../types/staff';
import { AlertCircleIcon, XIcon } from '../ui/Icons';

type Mode = 'invite' | 'create';

interface StaffAccountModalProps {
  onClose: () => void;
  onCreated: (staff: CreatedStaff) => void;
  onInvited: (email: string) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 12;
const MAX_PASSWORD = 128;

/**
 * Owner-only dialog that either emails a staff invitation
 * (`POST /api/v1/staff/invite`) or creates an account with an initial password
 * (`POST /api/v1/staff`). Both endpoints are verified in the backend.
 */
export function StaffAccountModal({
  onClose,
  onCreated,
  onInvited,
}: StaffAccountModalProps) {
  const [mode, setMode] = useState<Mode>('invite');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, pending]);

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setError(null);
    setHint(null);
    setPassword('');
    setConfirm('');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Enter the staff member’s name.');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode === 'create') {
      if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
        setError(
          `The password must be between ${MIN_PASSWORD} and ${MAX_PASSWORD} characters.`,
        );
        return;
      }
      if (password !== confirm) {
        setError('The passwords do not match.');
        return;
      }
    }

    setPending(true);
    setError(null);
    setHint(null);

    try {
      if (mode === 'invite') {
        await inviteStaff({ name: trimmedName, email: trimmedEmail });
        onInvited(trimmedEmail);
      } else {
        const created = await createStaffAccount({
          name: trimmedName,
          email: trimmedEmail,
          password,
        });
        onCreated(created);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (mode === 'invite' && err.status === 500) {
          setHint(
            'Email invitations need STAFF_INVITE_PREVIEW_URL on the backend. You can create the account with a password instead.',
          );
        } else if (mode === 'invite' && err.status === 503) {
          setHint(
            'The invitation email could not be delivered. Try again, or create the account with a password instead.',
          );
        } else if (mode === 'invite' && err.status === 409) {
          setHint('The staff member can sign in once the existing invite is used.');
        } else if (mode === 'create' && err.status === 409) {
          setHint('Use the email invitation flow if this person already has an invite.');
        }
      } else {
        setError(
          'Unable to reach the backend. Check that it is running and try again.',
        );
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={() => {
          if (!pending) onClose();
        }}
        className="absolute inset-0 bg-[color:var(--color-scrim)] cursor-pointer"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-modal-title"
        className="relative w-full sm:max-w-[520px] max-h-[92vh] overflow-y-auto rounded-t-[16px] sm:rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="staff-modal-title"
              className="text-lg font-bold text-[color:var(--color-ink)]"
            >
              Add a staff member
            </h2>
            <p className="text-xs text-[color:var(--color-muted)] mt-1">
              New members get staff access to inventory, sales and customers.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Close"
            className="w-9 h-9 shrink-0 rounded-[8px] flex items-center justify-center text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-[color:var(--color-ink)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div
          role="group"
          aria-label="How to add the staff member"
          className="mt-5 grid grid-cols-2 gap-1 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] p-1"
        >
          <ModeButton
            active={mode === 'invite'}
            onClick={() => switchMode('invite')}
          >
            Email invitation
          </ModeButton>
          <ModeButton
            active={mode === 'create'}
            onClick={() => switchMode('create')}
          >
            Set password now
          </ModeButton>
        </div>

        <p className="text-xs text-[color:var(--color-muted)] mt-3">
          {mode === 'invite'
            ? 'The backend emails a one-time link. The invitee chooses their own password.'
            : 'The backend emails a verification link. Share the password with the staff member securely.'}
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="staff-name"
              className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
            >
              Full name
            </label>
            <input
              ref={nameRef}
              id="staff-name"
              name="name"
              type="text"
              autoComplete="off"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full h-[44px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
              placeholder="Ada Obi"
            />
          </div>

          <div>
            <label
              htmlFor="staff-email"
              className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
            >
              Email address
            </label>
            <input
              id="staff-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="off"
              spellCheck={false}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full h-[44px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
              placeholder="ada@example.com"
            />
          </div>

          {mode === 'create' && (
            <>
              <div>
                <label
                  htmlFor="staff-password"
                  className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
                >
                  Initial password
                </label>
                <input
                  id="staff-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD}
                  maxLength={MAX_PASSWORD}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full h-[44px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
                  placeholder={`At least ${MIN_PASSWORD} characters`}
                />
              </div>
              <div>
                <label
                  htmlFor="staff-confirm"
                  className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
                >
                  Confirm password
                </label>
                <input
                  id="staff-confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD}
                  maxLength={MAX_PASSWORD}
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="w-full h-[44px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
                  placeholder="Repeat the password"
                />
              </div>
            </>
          )}

          {error && (
            <div
              role="alert"
              className="flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)]"
            >
              <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>{error}</p>
                {hint && (
                  <p className="text-[color:var(--color-muted)]">{hint}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="h-11 px-4 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-11 px-5 rounded-[8px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] text-sm font-semibold hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending
                ? 'Saving…'
                : mode === 'invite'
                  ? 'Send invitation'
                  : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 rounded-[6px] text-xs font-semibold transition-colors ${
        active
          ? 'bg-[color:var(--color-surface)] text-[color:var(--color-ink)] shadow-sm'
          : 'text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
      }`}
    >
      {children}
    </button>
  );
}
