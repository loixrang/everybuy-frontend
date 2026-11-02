import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../lib/api/auth';
import { ApiError } from '../../lib/api/client';
import { AuthShell } from '../../components/auth/AuthShell';
import {
  AlertCircleIcon,
  CheckCircleIcon,
} from '../../components/ui/Icons';

const MIN_PASSWORD = 12;
const MAX_PASSWORD = 128;

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return 'This reset link is invalid or has expired. Request a new one.';
    }
    if (error.status === 429) {
      return 'Too many attempts. Wait a moment and try again.';
    }
    if (error.status >= 500) {
      return 'We could not reset your password. Try again shortly.';
    }
    return error.message || 'Unable to reset the password.';
  }
  return 'Unable to connect. Check your connection and try again.';
}

/**
 * Completes the Better Auth reset flow (`POST /api/v1/auth/reset-password`).
 *
 * The emailed link lands here with `?token=…`, or `?error=INVALID_TOKEN` when
 * the token was invalid or expired. A successful reset revokes existing
 * sessions on the backend.
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const linkError = searchParams.get('error');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const invalidLink = !token || linkError !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

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

    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
      setPassword('');
      setConfirm('');
    } catch (err: unknown) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (invalidLink && !done) {
    return (
      <AuthShell>
        <h1 className="text-xl font-semibold tracking-tight">
          Reset link not valid
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted)]">
          {linkError === 'INVALID_TOKEN'
            ? 'This reset link is invalid or has expired.'
            : 'This page needs a reset token from the email link.'}
        </p>
        <div
          role="alert"
          className="mt-6 flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)]"
        >
          <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
          <span>Reset links expire after one hour and can be used once.</span>
        </div>
        <Link
          to="/forgot-password"
          className="mt-6 inline-flex items-center justify-center w-full h-11 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
        >
          Request a new link
        </Link>
        <p className="mt-5 text-sm">
          <Link
            to="/signin"
            className="font-semibold text-[color:var(--color-accent)] hover:text-[color:var(--color-accent-hover)]"
          >
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell>
        <h1 className="text-xl font-semibold tracking-tight">
          Password updated
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted)]">
          Sign in with your new password. Other sessions were signed out.
        </p>
        <div
          role="status"
          className="mt-6 flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-success-bg)] p-3 text-xs text-[color:var(--color-success-ink)]"
        >
          <CheckCircleIcon size={16} className="shrink-0 mt-0.5" />
          <span>Your password was changed.</span>
        </div>
        <Link
          to="/signin"
          className="mt-6 inline-flex items-center justify-center w-full h-11 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
        >
          Go to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-xl font-semibold tracking-tight">
        Choose a new password
      </h1>
      <p className="mt-2 text-sm text-[color:var(--color-muted)]">
        Use at least {MIN_PASSWORD} characters.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="new-password"
            className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="new-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              maxLength={MAX_PASSWORD}
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              className="w-full h-[46px] pl-3 pr-16 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
          >
            Confirm password
          </label>
          <input
            id="confirm-password"
            name="confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            maxLength={MAX_PASSWORD}
            required
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value);
              setError(null);
            }}
            className="w-full h-[46px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)]"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)]"
          >
            <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : 'Set new password'}
        </button>
      </form>

      <p className="mt-5 text-sm">
        <Link
          to="/signin"
          className="font-semibold text-[color:var(--color-accent)] hover:text-[color:var(--color-accent-hover)]"
        >
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
