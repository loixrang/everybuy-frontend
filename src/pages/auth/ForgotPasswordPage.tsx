import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../../lib/api/auth';
import { ApiError } from '../../lib/api/client';
import { AuthShell } from '../../components/auth/AuthShell';
import {
  AlertCircleIcon,
  CheckCircleIcon,
} from '../../components/ui/Icons';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return 'Too many reset requests. Wait a moment and try again.';
    }
    if (error.status >= 500) {
      return 'The API server could not send the email. Try again shortly.';
    }
    return error.message || 'Unable to request a password reset.';
  }
  return 'Cannot reach the API server. Check your connection and try again.';
}

/**
 * Starts the Better Auth password-reset flow
 * (`POST /api/v1/auth/request-password-reset`).
 *
 * The backend always answers 200, so the screen never reveals whether an
 * account exists. The email link opens `/reset-password?token=…`.
 */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await requestPasswordReset(
        trimmed,
        `${window.location.origin}/reset-password`,
      );
      setSentTo(trimmed);
    } catch (err: unknown) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-sm text-[color:var(--color-muted)]">
        Enter the email address on your Everybuy account and we will send a reset
        link. The link expires after one hour.
      </p>

      {sentTo ? (
        <div className="mt-6 space-y-4">
          <div
            role="status"
            className="flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-success-bg)] p-3 text-xs text-[color:var(--color-success-ink)]"
          >
            <CheckCircleIcon size={16} className="shrink-0 mt-0.5" />
            <span>
              If an account exists for {sentTo}, a reset link is on its way. Check
              the inbox and spam folder.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setEmail('');
            }}
            className="w-full h-11 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="reset-email"
              className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
            >
              Email address
            </label>
            <input
              id="reset-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              spellCheck={false}
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              placeholder="samuel@example.com"
              className="w-full h-[46px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
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
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

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
