import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../../components/auth/AuthShell';
import {
  acceptStaffInvitation,
  previewStaffInvitation,
} from '../../lib/api/staff';
import {
  INVITATION_MAX_PASSWORD,
  INVITATION_MIN_PASSWORD,
  MISSING_INVITATION_TOKEN_MESSAGE,
  describeInvitationAcceptError,
  describeInvitationPreviewError,
  getInvitationToken,
  isInvitationSubmitBlocked,
  logInvitationDiagnostic,
  validateInvitationPassword,
} from '../../lib/invitations';
import { formatLongDate } from '../../lib/utils/format';
import type { InvitationPreview } from '../../types/staff';
import {
  AlertCircleIcon,
  CheckCircleIcon,
} from '../../components/ui/Icons';

type PreviewState = 'loading' | 'ready' | 'invalid' | 'error';
type SubmitState = 'idle' | 'submitting' | 'done';

/**
 * Public invitation landing page (`/invite/accept?token=…`).
 *
 * The backend emails this link from `POST /api/v1/staff/invite`. The token is
 * the credential: preview it, let the invitee choose a password, then create
 * the account through `POST /api/v1/staff/invite/accept`.
 *
 * The route is registered outside `ProtectedRoute`, so it works for visitors
 * who are not signed in. The raw token stays in memory only and is removed
 * from the address bar after a confirmed acceptance.
 */
export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(
    () => getInvitationToken(searchParams.get('token')),
    [searchParams],
  );

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>(
    token ? 'loading' : 'invalid',
  );
  const [previewError, setPreviewError] = useState<string | null>(
    token ? null : MISSING_INVITATION_TOKEN_MESSAGE,
  );
  const [retryKey, setRetryKey] = useState(0);

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  // Synchronous duplicate-submit guard: React state updates are async, so two
  // events in the same tick could otherwise both start an acceptance request.
  const submittingRef = useRef(false);
  // Once acceptance succeeds we strip the token from the URL. Do not let that
  // URL change reset the success state back to "missing token".
  const acceptedRef = useRef(false);

  useEffect(() => {
    if (acceptedRef.current || !token) return;

    let ignore = false;

    async function loadPreview() {
      try {
        const result = await previewStaffInvitation(token);
        if (ignore) return;
        setPreview(result);
        setPreviewState('ready');
      } catch (err: unknown) {
        if (ignore) return;
        logInvitationDiagnostic('preview', err);
        const failure = describeInvitationPreviewError(err);
        setPreviewError(failure.message);
        setPreviewState(failure.kind === 'invalid' ? 'invalid' : 'error');
      }
    }

    void loadPreview();
    return () => {
      ignore = true;
    };
  }, [token, retryKey]);

  // Derive the missing-token state during render. After a successful accept the
  // token is removed from the URL, but `done` keeps the confirmation visible.
  const visiblePreviewState: PreviewState =
    !token && submitState !== 'done' ? 'invalid' : previewState;
  const visiblePreviewError =
    !token && submitState !== 'done'
      ? MISSING_INVITATION_TOKEN_MESSAGE
      : previewError;

  const retryPreview = useCallback(() => {
    setPreview(null);
    setPreviewState('loading');
    setPreviewError(null);
    setFieldError(null);
    setRetryKey((key) => key + 1);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current || isInvitationSubmitBlocked(false, token)) {
      return;
    }

    setFieldError(null);
    const validation = validateInvitationPassword(password, confirmation);
    if (!validation.valid) {
      setFieldError(validation.message);
      return;
    }

    submittingRef.current = true;
    setSubmitState('submitting');

    try {
      await acceptStaffInvitation({ token, password });

      acceptedRef.current = true;
      setPassword('');
      setConfirmation('');
      setSubmitState('done');

      // Keep the token out of browser history after a confirmed acceptance.
      navigate({ pathname: '/invite/accept' }, { replace: true });
    } catch (err: unknown) {
      logInvitationDiagnostic('accept', err);
      setFieldError(describeInvitationAcceptError(err));
      setSubmitState('idle');
    } finally {
      submittingRef.current = false;
    }
  }

  const confirmMismatch =
    confirmation.length > 0 && password !== confirmation
      ? 'The passwords do not match yet.'
      : null;

  return (
    <AuthShell>
      {visiblePreviewState === 'loading' && (
        <div className="animate-pulse space-y-4" aria-busy="true">
          <div className="h-5 w-40 rounded-[4px] bg-[color:var(--color-subtle)]" />
          <div className="h-4 w-full rounded-[4px] bg-[color:var(--color-subtle)]" />
          <div className="h-4 w-3/4 rounded-[4px] bg-[color:var(--color-subtle)]" />
          <div className="h-11 w-full rounded-[8px] bg-[color:var(--color-subtle)]" />
          <div className="h-11 w-full rounded-[8px] bg-[color:var(--color-subtle)]" />
          <p className="sr-only" role="status">
            Checking your invitation…
          </p>
        </div>
      )}

      {visiblePreviewState === 'invalid' && (
        <>
          <h1 className="text-xl font-semibold tracking-tight">
            Invitation unavailable
          </h1>
          <div
            role="alert"
            className="mt-4 flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)]"
          >
            <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
            <span>{visiblePreviewError}</span>
          </div>
          <BackToSignIn />
        </>
      )}

      {visiblePreviewState === 'error' && (
        <>
          <h1 className="text-xl font-semibold tracking-tight">
            Unable to load the invitation
          </h1>
          <div
            role="alert"
            className="mt-4 flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)]"
          >
            <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
            <span>{visiblePreviewError}</span>
          </div>
          <button
            type="button"
            onClick={retryPreview}
            className="mt-4 inline-flex items-center justify-center h-11 w-full rounded-[8px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] text-sm font-semibold hover:bg-[color:var(--color-accent-hover)] transition-colors"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => navigate('/signin')}
            className="mt-2 inline-flex items-center justify-center h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
          >
            Back to sign in
          </button>
        </>
      )}

      {visiblePreviewState === 'ready' && submitState === 'done' && (
        <InvitationSuccess
          name={preview?.name}
          email={preview?.email}
        />
      )}

      {visiblePreviewState === 'ready' && submitState !== 'done' && preview && (
        <>
          <h1 className="text-xl font-semibold tracking-tight">
            Join the Everybuy team
          </h1>
          <p className="mt-2 text-sm text-[color:var(--color-muted)]">
            {preview.name
              ? `${preview.name}, you were invited to join Everybuy as a staff member.`
              : 'You were invited to join Everybuy as a staff member.'}{' '}
            Choose a password to create your account.
          </p>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[color:var(--color-muted)]">Name</dt>
              <dd className="font-semibold text-[color:var(--color-ink)] break-all text-right">
                {preview.name || '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[color:var(--color-muted)]">Email</dt>
              <dd className="font-semibold text-[color:var(--color-ink)] break-all text-right">
                {preview.email}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[color:var(--color-muted)]">Role</dt>
              <dd className="font-semibold text-[color:var(--color-ink)] text-right">
                Staff
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[color:var(--color-muted)]">
                Invitation expires
              </dt>
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
                minLength={INVITATION_MIN_PASSWORD}
                maxLength={INVITATION_MAX_PASSWORD}
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFieldError(null);
                }}
                aria-describedby="invite-password-hint"
                placeholder={`At least ${INVITATION_MIN_PASSWORD} characters`}
                className="w-full h-[46px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
              />
              <p
                id="invite-password-hint"
                className="mt-1 text-xs text-[color:var(--color-muted)]"
              >
                Use {INVITATION_MIN_PASSWORD} to {INVITATION_MAX_PASSWORD}{' '}
                characters.
              </p>
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
                name="confirmation"
                type="password"
                autoComplete="new-password"
                minLength={INVITATION_MIN_PASSWORD}
                maxLength={INVITATION_MAX_PASSWORD}
                required
                value={confirmation}
                onChange={(event) => {
                  setConfirmation(event.target.value);
                  setFieldError(null);
                }}
                aria-describedby={
                  confirmMismatch ? 'invite-confirm-hint' : undefined
                }
                aria-invalid={confirmMismatch ? true : undefined}
                placeholder="Repeat the password"
                className="w-full h-[46px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
              />
              {confirmMismatch && (
                <p
                  id="invite-confirm-hint"
                  className="mt-1 text-xs text-[color:var(--color-danger-ink)]"
                >
                  {confirmMismatch}
                </p>
              )}
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
              disabled={isInvitationSubmitBlocked(
                submitState === 'submitting',
                token,
              )}
              className="inline-flex items-center justify-center h-11 w-full rounded-[8px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] text-sm font-semibold hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitState === 'submitting'
                ? 'Creating account…'
                : 'Create account'}
            </button>

            <p className="text-center text-[11px] text-[color:var(--color-muted)]">
              Already have an account?{' '}
              <Link
                to="/signin"
                className="font-semibold text-[color:var(--color-accent-ink)] hover:underline underline-offset-2"
              >
                Sign in
              </Link>
            </p>
          </form>
        </>
      )}
    </AuthShell>
  );
}

/** Confirmation shown only after the backend confirms account creation. */
export function InvitationSuccess({
  name,
  email,
}: {
  name?: string;
  email?: string;
}) {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">
        Your account is ready
      </h1>
      <div
        role="status"
        className="mt-4 flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-success-bg)] p-3 text-xs text-[color:var(--color-success-ink)]"
      >
        <CheckCircleIcon size={16} className="shrink-0 mt-0.5" />
        <span>
          {name ? `${name}, your` : 'Your'} Everybuy staff account has been
          created. Sign in with {email ?? 'your email address'}.
        </span>
      </div>
      <Link
        to="/signin"
        className="mt-6 inline-flex items-center justify-center h-11 w-full rounded-[8px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] text-sm font-semibold hover:bg-[color:var(--color-accent-hover)] transition-colors"
      >
        Go to sign in
      </Link>
    </>
  );
}

function BackToSignIn() {
  return (
    <Link
      to="/signin"
      className="mt-6 inline-flex items-center justify-center h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
    >
      Back to sign in
    </Link>
  );
}
