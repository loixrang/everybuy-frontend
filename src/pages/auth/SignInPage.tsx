import { useId, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/auth/auth-context';
import { sendTwoFactorOtp } from '../../lib/api/auth';
import { ApiError } from '../../lib/api/client';
import { useTheme } from '../../lib/hooks/useTheme';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  MoonIcon,
  ShoppingBagIcon,
  SunIcon,
} from '../../components/ui/Icons';
import type { TwoFactorMethod } from '../../types/auth';

type Mode = 'credentials' | 'two-factor';

const DEFAULT_DESTINATION = '/inventory';
const CODE_PATTERN = /^\d{6}$/;

function errorCodeOf(error: ApiError): string | null {
  const data = error.data;
  if (typeof data === 'object' && data !== null && 'code' in data) {
    const code = (data as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return null;
}

function describeSignInError(error: unknown): string {
  if (error instanceof ApiError) {
    const code = errorCodeOf(error);

    if (code === 'EMAIL_NOT_VERIFIED') {
      return 'This email address has not been verified yet. Open the verification link sent to your inbox, then sign in again.';
    }
    if (code === 'INVALID_ORIGIN') {
      return 'This site is not trusted by the API. The backend FRONTEND_URL must match the address you are using.';
    }
    if (error.status === 401) {
      return 'Email or password is incorrect.';
    }
    if (error.status === 429) {
      return 'Too many sign-in attempts. Wait a moment and try again.';
    }
    if (error.status >= 500) {
      return 'The API server could not complete the request. Try again shortly.';
    }
    return error.message || 'Sign-in failed. Try again.';
  }

  return 'Cannot reach the API server. Check your connection and that VITE_API_BASE_URL is correct.';
}

function describeTwoFactorError(error: unknown): string {
  if (error instanceof ApiError) {
    const code = errorCodeOf(error);

    if (code === 'INVALID_CODE' || error.status === 401) {
      return 'That code is not correct. Check it and try again.';
    }
    if (code === 'OTP_HAS_EXPIRED') {
      return 'That code has expired. Request a new code.';
    }
    if (
      code === 'TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE' ||
      code === 'ACCOUNT_TEMPORARILY_LOCKED' ||
      error.status === 429
    ) {
      return 'Too many verification attempts. Request a new code or try again later.';
    }
    if (code === 'INVALID_TWO_FACTOR_COOKIE') {
      return 'This sign-in attempt expired. Go back and sign in again.';
    }
    if (code === 'TOTP_NOT_ENABLED') {
      return 'Authenticator-app codes are not enabled for this account. Use an email code instead.';
    }
    if (code === 'OTP_NOT_CONFIGURED' || code === 'OTP_NOT_ENABLED') {
      return 'Email codes are not available for this account. Use your authenticator app.';
    }
    return error.message || 'Verification failed. Try again.';
  }

  return 'Cannot reach the API server. Check your connection and try again.';
}

export function SignInPage() {
  const { signIn, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const emailId = useId();
  const passwordId = useId();
  const codeId = useId();

  const [mode, setMode] = useState<Mode>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [methods, setMethods] = useState<TwoFactorMethod[]>([]);
  const [method, setMethod] = useState<TwoFactorMethod>('totp');
  const [code, setCode] = useState('');

  const state = location.state as { from?: unknown } | null;
  const destination =
    typeof state?.from === 'string' &&
    state.from.startsWith('/') &&
    !state.from.startsWith('//')
      ? state.from
      : DEFAULT_DESTINATION;

  async function requestCode() {
    if (sendingCode) return;
    setSendingCode(true);
    setError(null);
    setNotice(null);
    try {
      await sendTwoFactorOtp();
      setNotice('A 6-digit code was sent to your email.');
    } catch (err: unknown) {
      setError(describeTwoFactorError(err));
    } finally {
      setSendingCode(false);
    }
  }

  function switchMethod(next: TwoFactorMethod) {
    if (next === method) return;
    setMethod(next);
    setCode('');
    setError(null);
    setNotice(null);
    if (next === 'otp') {
      void requestCode();
    }
  }

  function backToCredentials() {
    setMode('credentials');
    setPassword('');
    setCode('');
    setError(null);
    setNotice(null);
    setMethods([]);
  }

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter your email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const result = await signIn(trimmedEmail, password);

      if (!result.twoFactorRequired) {
        navigate(destination, { replace: true });
        return;
      }

      const available = result.methods;
      const preferred: TwoFactorMethod = available.includes('totp')
        ? 'totp'
        : 'otp';

      setMethods(available);
      setMethod(preferred);
      setCode('');
      setMode('two-factor');

      if (available.length === 0) {
        setError(
          'Two-factor authentication is required, but the API did not report a verification method. Contact the shop owner.',
        );
      } else if (preferred === 'otp') {
        await requestCode();
      }
    } catch (err: unknown) {
      setError(describeSignInError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (verifying) return;

    const trimmed = code.trim();
    if (!CODE_PATTERN.test(trimmed)) {
      setError('Enter the 6-digit code.');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      await verifyTwoFactor(trimmed, method);
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      setError(describeTwoFactorError(err));
      setCode('');
    } finally {
      setVerifying(false);
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
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-7 h-[26px] rounded-[6px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] flex items-center justify-center">
            <ShoppingBagIcon size={16} />
          </div>
          <span className="font-extrabold text-2xl tracking-tight">Everybuy</span>
        </div>

        <div className="w-full max-w-[440px] rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6">
          {mode === 'credentials' ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight">
                Welcome back
              </h1>
              <p className="mt-2 text-base text-[color:var(--color-muted)]">
                Sign in to the physical store.
              </p>

              <form
                className="mt-8 space-y-4"
                onSubmit={handleCredentialsSubmit}
                noValidate
              >
                <div>
                  <label
                    htmlFor={emailId}
                    className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
                  >
                    Email address
                  </label>
                  <input
                    id={emailId}
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="samuel@example.com"
                    className="w-full h-[46px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor={passwordId}
                    className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id={passwordId}
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
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

                {error && <AuthErrorPanel message={error} />}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <p className="mt-4 text-sm text-[color:var(--color-muted)]">
                Ask the shop owner if you need access.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight">
                Confirm it&rsquo;s you
              </h1>
              <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                {method === 'totp'
                  ? 'Enter the 6-digit code from your authenticator app.'
                  : 'Enter the 6-digit code we emailed to you.'}
              </p>

              <form
                className="mt-6 space-y-4"
                onSubmit={handleVerifySubmit}
                noValidate
              >
                <div>
                  <label
                    htmlFor={codeId}
                    className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
                  >
                    {method === 'totp' ? 'Authenticator code' : 'Email code'}
                  </label>
                  <input
                    id={codeId}
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="000000"
                    className="w-full h-[46px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-lg font-semibold tracking-[0.35em] text-center text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
                  />
                </div>

                {notice && <AuthNoticePanel message={notice} />}
                {error && <AuthErrorPanel message={error} />}

                <button
                  type="submit"
                  disabled={verifying}
                  className="w-full h-11 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {verifying ? 'Verifying…' : 'Verify and sign in'}
                </button>
              </form>

              <div className="mt-4 space-y-2 text-sm">
                {method === 'totp' && methods.includes('otp') && (
                  <button
                    type="button"
                    onClick={() => switchMethod('otp')}
                    className="font-semibold text-[color:var(--color-accent)] hover:text-[color:var(--color-accent-hover)]"
                  >
                    Email me a code instead
                  </button>
                )}
                {method === 'otp' && methods.includes('totp') && (
                  <button
                    type="button"
                    onClick={() => switchMethod('totp')}
                    className="font-semibold text-[color:var(--color-accent)] hover:text-[color:var(--color-accent-hover)]"
                  >
                    Use my authenticator app instead
                  </button>
                )}
                {method === 'otp' && (
                  <button
                    type="button"
                    onClick={() => void requestCode()}
                    disabled={sendingCode}
                    className="font-semibold text-[color:var(--color-accent)] hover:text-[color:var(--color-accent-hover)] disabled:opacity-60"
                  >
                    {sendingCode ? 'Sending…' : 'Send a new code'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={backToCredentials}
                  className="font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
                >
                  Back to sign in
                </button>
              </div>
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

function AuthErrorPanel({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)]"
    >
      <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function AuthNoticePanel({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-success-bg)] p-3 text-xs text-[color:var(--color-success-ink)]"
    >
      <CheckCircleIcon size={16} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}
