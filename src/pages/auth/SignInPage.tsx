import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/auth/auth-context';
import { sendTwoFactorOtp, sendVerificationEmail } from '../../lib/api/auth';
import { isPasskeySupported } from '../../lib/api/passkeys';
import { describeTwoFactorError } from '../../lib/auth-errors';
import { describePasskeySignInError } from '../../lib/passkey-errors';
import { ApiError } from '../../lib/api/client';
import { useTheme } from '../../lib/hooks/useTheme';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  KeyIcon,
  MoonIcon,
  ShoppingBagIcon,
  SunIcon,
} from '../../components/ui/Icons';
import type { TwoFactorLoginMethod, TwoFactorMethod } from '../../types/auth';

type Mode = 'credentials' | 'two-factor' | 'email-verification';

const DEFAULT_DESTINATION = '/inventory';
const CODE_PATTERN = /^\d{6}$/;
const BACKUP_CODE_PATTERN = /^[A-Z0-9]{5}-[A-Z0-9]{5}$/;

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
      return 'Your email address is not verified yet. We could not send a verification email. You can try again below.';
    }
    if (code === 'INVALID_ORIGIN') {
      return 'This site could not be verified. Try refreshing the page or contact the shop owner.';
    }
    if (error.status === 401) {
      return 'Email or password is incorrect.';
    }
    if (error.status === 429) {
      return 'Too many sign-in attempts. Wait a moment and try again.';
    }
    if (error.status >= 500) {
      return 'We could not sign you in. Try again shortly.';
    }
    return error.message || 'Sign-in failed. Try again.';
  }

  return 'Unable to connect. Check your connection and try again.';
}

export function SignInPage() {
  const { signIn, verifyTwoFactor, signInWithPasskey } = useAuth();
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
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeySupported] = useState(() => isPasskeySupported());
  const [verifying, setVerifying] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationCooldown, setVerificationCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [methods, setMethods] = useState<TwoFactorLoginMethod[]>([]);
  const [method, setMethod] = useState<TwoFactorMethod>('totp');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (verificationCooldown <= 0) return;
    const timer = window.setTimeout(
      () => setVerificationCooldown((remaining) => Math.max(0, remaining - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [verificationCooldown]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = window.setTimeout(
      () => setOtpCooldown((remaining) => Math.max(0, remaining - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [otpCooldown]);

  async function requestVerificationEmail(address: string) {
    if (sendingVerification) return;
    setSendingVerification(true);
    setError(null);
    setNotice(null);
    try {
      await sendVerificationEmail(address);
      setNotice('Your email is not verified. A verification email has been sent. Check your inbox and spam folder, then sign in again.');
      setVerificationCooldown(30);
    } catch {
      setError('Your email is not verified, and we could not send the verification email. Check your connection and try again.');
    } finally {
      setSendingVerification(false);
    }
  }

  const state = location.state as { from?: unknown } | null;
  const destination =
    typeof state?.from === 'string' &&
    state.from.startsWith('/') &&
    !state.from.startsWith('//')
      ? state.from
      : DEFAULT_DESTINATION;

  async function requestCode() {
    if (sendingCode || otpCooldown > 0) return;
    setSendingCode(true);
    setError(null);
    setNotice(null);
    try {
      await sendTwoFactorOtp();
      setNotice('The email code request was accepted. Check your inbox and spam folder.');
      setOtpCooldown(10);
    } catch (err: unknown) {
      setError(
        err instanceof Error &&
          !(err instanceof ApiError) &&
          err.message === 'The email code request was not confirmed.'
          ? err.message
          : describeTwoFactorError(err),
      );
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
      if (otpCooldown > 0) {
        setNotice('Use the email code already requested for this sign-in. You can request another when the timer ends.');
      } else {
        void requestCode();
      }
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
      if (err instanceof ApiError && errorCodeOf(err) === 'EMAIL_NOT_VERIFIED') {
        setEmail(trimmedEmail);
        setMode('email-verification');
        await requestVerificationEmail(trimmedEmail);
      } else {
        setError(describeSignInError(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasskeySignIn() {
    if (passkeyBusy || submitting) return;

    setPasskeyBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithPasskey();
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      setError(describePasskeySignInError(err));
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (verifying) return;

    const trimmed = code.trim();
    if (method === 'backup' ? !BACKUP_CODE_PATTERN.test(trimmed) : !CODE_PATTERN.test(trimmed)) {
      setError(method === 'backup'
        ? 'Enter the recovery code in XXXXX-XXXXX format.'
        : 'Enter the 6-digit code.');
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
          className="glass-panel-compact w-10 h-10 rounded-[8px] flex items-center justify-center border border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-subtle)] text-[color:var(--color-ink)] transition-colors"
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
                Sign in to your account.
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
                    placeholder="name@example.com"
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

                <div className="flex justify-end -mt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-[color:var(--color-accent)] hover:text-[color:var(--color-accent-hover)]"
                  >
                    Forgot your password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3" aria-hidden="true">
                <div className="h-px flex-1 bg-[color:var(--color-border)]" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
                  or
                </span>
                <div className="h-px flex-1 bg-[color:var(--color-border)]" />
              </div>

              <button
                type="button"
                onClick={() => void handlePasskeySignIn()}
                disabled={passkeyBusy || submitting || !passkeySupported}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <KeyIcon size={17} />
                {passkeyBusy ? 'Waiting for your device…' : 'Sign in with a passkey'}
              </button>
              <p className="mt-2 text-center text-[11px] text-[color:var(--color-muted)]">
                {passkeySupported
                  ? 'Use a passkey saved on this device. No authenticator code is needed.'
                  : 'Passkeys are not supported in this browser.'}
              </p>

              <p className="mt-4 text-sm text-[color:var(--color-muted)]">
                Ask the shop owner if you need access.
              </p>
            </>
          ) : mode === 'email-verification' ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight">
                Verify your email
              </h1>
              <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                This account&rsquo;s email address has not been verified.
              </p>

              <div className="mt-6 space-y-4">
                {notice && <AuthNoticePanel message={notice} />}
                {error && <AuthErrorPanel message={error} />}
                <button
                  type="button"
                  onClick={() => void requestVerificationEmail(email)}
                  disabled={sendingVerification || verificationCooldown > 0}
                  className="w-full h-11 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sendingVerification
                    ? 'Sending…'
                    : verificationCooldown > 0
                      ? `Resend in ${verificationCooldown}s`
                      : notice
                        ? 'Resend verification email'
                        : 'Try sending again'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('credentials');
                    setError(null);
                    setNotice(null);
                  }}
                  className="w-full h-11 rounded-[8px] font-semibold text-sm border border-[color:var(--color-border)] hover:bg-[color:var(--color-subtle)]"
                >
                  Back to sign in
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight">
                Confirm it&rsquo;s you
              </h1>
              <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                {method === 'totp'
                  ? 'Enter the 6-digit code from your authenticator app.'
                  : method === 'otp'
                    ? 'Enter the 6-digit email code requested for this sign-in.'
                    : 'Enter one of your unused recovery codes.'}
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
                    {method === 'totp'
                      ? 'Authenticator code'
                      : method === 'otp'
                        ? 'Email code'
                        : 'Recovery code'}
                  </label>
                  <input
                    id={codeId}
                    name="code"
                    type="text"
                    inputMode={method === 'backup' ? 'text' : 'numeric'}
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={method === 'backup' ? 11 : 6}
                    value={code}
                    onChange={(event) => setCode(
                      method === 'backup'
                        ? event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 11)
                        : event.target.value.replace(/\D/g, '').slice(0, 6),
                    )}
                    placeholder={method === 'backup' ? 'ABCDE-12345' : '000000'}
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
                    disabled={verifying || sendingCode}
                    className="font-semibold text-[color:var(--color-accent)] hover:text-[color:var(--color-accent-hover)]"
                  >
                    Email me a code instead
                  </button>
                )}
                {method === 'otp' && methods.includes('totp') && (
                  <button
                    type="button"
                    onClick={() => switchMethod('totp')}
                    disabled={verifying || sendingCode}
                    className="font-semibold text-[color:var(--color-accent)] hover:text-[color:var(--color-accent-hover)]"
                  >
                    Use my authenticator app instead
                  </button>
                )}
                {method === 'otp' && (
                  <button
                    type="button"
                    onClick={() => void requestCode()}
                    disabled={sendingCode || otpCooldown > 0}
                    className="font-semibold text-[color:var(--color-accent)] hover:text-[color:var(--color-accent-hover)] disabled:opacity-60"
                  >
                    {sendingCode
                      ? 'Requesting…'
                      : otpCooldown > 0
                        ? `Request another in ${otpCooldown}s`
                        : 'Request a new code'}
                  </button>
                )}
                {method !== 'backup' && (
                  <button
                    type="button"
                    onClick={() => switchMethod('backup')}
                    disabled={verifying || sendingCode}
                    className="block font-semibold text-[color:var(--color-accent)] hover:text-[color:var(--color-accent-hover)]"
                  >
                    Use a recovery code instead
                  </button>
                )}
                {method === 'backup' && (
                  <button
                    type="button"
                    onClick={() => switchMethod(methods.includes('totp') ? 'totp' : 'otp')}
                    disabled={verifying || sendingCode}
                    className="block font-semibold text-[color:var(--color-accent)] hover:text-[color:var(--color-accent-hover)]"
                  >
                    Use an authenticator or email code
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
          Everybuy
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
