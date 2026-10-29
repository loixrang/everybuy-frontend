import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  acceptStaffInvitation,
  previewStaffInvitation,
} from '../../lib/api/staff';
import { ApiError } from '../../lib/api/client';
import { useTheme } from '../../lib/hooks/useTheme';
import { formatLongDate } from '../../lib/utils/format';
import type { InvitationPreview } from '../../types/staff';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  MoonIcon,
  ShoppingBagIcon,
  SunIcon,
} from '../../components/ui/Icons';

type PreviewState = 'loading' | 'ready' | 'invalid' | 'error';
type SubmitState = 'idle' | 'submitting' | 'done';

const MIN_PASSWORD = 12;
const MAX_PASSWORD = 128;

/**
 * Public invitation landing page (`/accept-invite?token=…`).
 *
 * The backend emails this link from `POST /api/v1/staff/invite`. The token is
 * the credential: preview it, let the invitee choose a password, then create
 * the account through `POST /api/v1/staff/invite/accept`.
 */
export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const { theme, toggleTheme } = useTheme();

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>(
    token ? 'loading' : 'invalid',
  );
  const [previewError, setPreviewError] = useState<string | null>(
    token ? null : 'This invitation link is missing its token.',
  );

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    async function load() {
      try {
        const result = await previewStaffInvitation(token);
        if (ignore) return;
        setPreview(result);
        setPreviewState('ready');
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiError && err.status === 400) {
          setPreviewError(
            'This invitation is invalid, expired, or has already been used. Ask an owner for a new one.',
          );
          setPreviewState('invalid');
          return;
        }
        setPreviewError(
          err instanceof ApiError
            ? err.message
            : 'Unable to reach the backend. Check that it is running and try again.',
        );
        setPreviewState('error');
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [token]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitState !== 'idle') return;

    setFieldError(null);

    if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
      setFieldError(
        `Choose a password between ${MIN_PASSWORD} and ${MAX_PASSWORD} characters.`,
      );
      return;
    }
    if (password !== confirm) {
      setFieldError('The passwords do not match.');
      return;
    }

    setSubmitState('submitting');
    try {
      await acceptStaffInvitation({ token, password });
      setSubmitState('done');
    } catch (err: unknown) {
      setSubmitState('idle');
      setFieldError(
        err instanceof ApiError
          ? err.message
          : 'Unable to create the account. Check your connection and try again.',
      );
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[color:var(--color-canvas)] text-[color:var(--color-ink)]">
      <div className="fixed top-[calc(1.25rem+env(safe-area-inset-top))] right-[calc(1.25rem+env(safe-area-inset-right))] z-10">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-10 h-10 rounded-[8px] flex items-center justify-center border border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-subtle)] text-[color:var(--color-ink)] transition-colors"
          aria-label="Toggle light/dark theme"
        >
          {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
        </button>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-16">
        <Link to="/signin" className="flex items-center gap-2.5 mb-8">
          <div className="w-7 h-[26px] rounded-[6px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] flex items-center justify-center">
            <ShoppingBagIcon size={16} />
          </div>
          <span className="font-extrabold text-2xl tracking-tight">Everybuy</span>
        </Link>

        <div className="w-full max-w-[440px] rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6">
          {previewState === 'loading' && (
            <div className="animate-pulse space-y-4" aria-busy="true">
              <div className="h-5 w-40 rounded-[4px] bg-[color:var(--color-subtle)]" />
              <div className="h-4 w-full rounded-[4px] bg-[color:var(--color-subtle)]" />
              <div className="h-11 w-full rounded-[8px] bg-[color:var(--color-subtle)]" />
              <div className="h-11 w-full rounded-[8px] bg-[color:var(--color-subtle)]" />
            </div>
          )}

          {previewState === 'invalid' && (
            <>
              <h1 className="text-xl font-semibold tracking-tight">
                Invitation unavailable
              </h1>
              <div
                role="alert"
                className="mt-4 flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)]"
              >
                <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
                <span>{previewError}</span>
              </div>
              <Link
                to="/signin"
                className="mt-6 inline-flex items-center justify-center h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
              >
                Back to sign in
              </Link>
            </>
          )}

          {previewState === 'error' && (
            <>
              <h1 className="text-xl font-semibold tracking-tight">
                Unable to load the invitation
              </h1>
              <div
                role="alert"
                className="mt-4 flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)]"
              >
                <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
                <span>{previewError}</span>
              </div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 inline-flex items-center justify-center h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
              >
                Retry
              </button>
            </>
          )}

          {previewState === 'ready' && submitState === 'done' && (
            <>
              <h1 className="text-xl font-semibold tracking-tight">
                Account created
              </h1>
              <div
                role="status"
                className="mt-4 flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-success-bg)] p-3 text-xs text-[color:var(--color-success-ink)]"
              >
                <CheckCircleIcon size={16} className="shrink-0 mt-0.5" />
                <span>
                  {preview?.name}, your Everybuy staff account is ready. Sign in with{' '}
                  {preview?.email}.
                </span>
              </div>
              <Link
                to="/signin"
                className="mt-6 inline-flex items-center justify-center h-11 w-full rounded-[8px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] text-sm font-semibold hover:bg-[color:var(--color-accent-hover)] transition-colors"
              >
                Go to sign in
              </Link>
            </>
          )}

          {previewState === 'ready' && submitState !== 'done' && preview && (
            <>
              <h1 className="text-xl font-semibold tracking-tight">
                Join {preview.name ? 'the team' : 'Everybuy'}
              </h1>
              <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                {preview.name ? `${preview.name}, you were` : 'You were'} invited to
                join Everybuy as a staff member.
              </p>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[color:var(--color-muted)]">Email</dt>
                  <dd className="font-semibold text-[color:var(--color-ink)] break-all text-right">
                    {preview.email}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[color:var(--color-muted)]">Invitation expires</dt>
                  <dd className="font-semibold text-[color:var(--color-ink)] text-right">
                    {formatLongDate(preview.expiresAt)}
                  </dd>
                </div>
              </dl>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
                <div>
                  <label
                    htmlFor="invite-password"
                    className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
                  >
                    Choose a password
                  </label>
                  <input
                    id="invite-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD}
                    maxLength={MAX_PASSWORD}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={`At least ${MIN_PASSWORD} characters`}
                    className="w-full h-[46px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="invite-confirm"
                    className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
                  >
                    Confirm password
                  </label>
                  <input
                    id="invite-confirm"
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD}
                    maxLength={MAX_PASSWORD}
                    required
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    placeholder="Repeat the password"
                    className="w-full h-[46px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
                  />
                </div>

                {fieldError && (
                  <div
                    role="alert"
                    className="flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)]"
                  >
                    <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
                    <span>{fieldError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitState === 'submitting'}
                  className="inline-flex items-center justify-center h-11 w-full rounded-[8px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] text-sm font-semibold hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitState === 'submitting' ? 'Creating account…' : 'Create account'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-xs font-medium text-[color:var(--color-muted)]">
          Everybuy &middot; Physical store inventory
        </p>
      </main>
    </div>
  );
}
