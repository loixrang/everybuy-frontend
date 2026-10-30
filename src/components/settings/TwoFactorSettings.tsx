import { useState, type FormEvent } from 'react';
import {
  disableTwoFactor,
  enableTwoFactorTotp,
  generateTwoFactorBackupCodes,
  verifyTwoFactorTotp,
} from '../../lib/api/auth';
import { ApiError } from '../../lib/api/client';
import type { TOTPEnrollmentResponse } from '../../types/auth';
import { AlertCircleIcon, CheckCircleIcon } from '../ui/Icons';

interface TwoFactorSettingsProps {
  enabled: boolean;
  refreshSession: () => Promise<void>;
}

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    const data = error.data;
    const code = typeof data === 'object' && data !== null && 'code' in data
      ? String((data as { code: unknown }).code)
      : '';
    if (code === 'INVALID_PASSWORD') return 'The password is incorrect.';
    if (code === 'INVALID_CODE') return 'That authenticator code is not valid. Check the current code and try again.';
    if (code === 'TOTP_ALREADY_ENABLED') return 'Authenticator setup is already active. Finish verifying its current setup code or try again.';
    if (code === 'TWO_FACTOR_NOT_ENABLED') return 'Recovery codes are not available for this account.';
    if (code === 'TOTP_NOT_ENABLED') return 'No authenticator setup is available to verify.';
    if (code === 'TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE' || error.status === 429) {
      return 'Too many security requests. Wait a moment and try again.';
    }
    return error.message || 'The security change could not be completed.';
  }
  return 'Cannot reach the authentication server. Check your connection and try again.';
}

export function TwoFactorSettings({ enabled, refreshSession }: TwoFactorSettingsProps) {
  const [enrollment, setEnrollment] = useState<TOTPEnrollmentResponse | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function beginEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!password) {
      setError('Enter your current password to set up an authenticator.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await enableTwoFactorTotp(password);
      setEnrollment(result);
      setPassword('');
    } catch (err: unknown) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !enrollment) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit authenticator code.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await verifyTwoFactorTotp(code);
      await refreshSession();
      setRecoveryCodes(enrollment.backupCodes);
      setEnrollment(null);
      setCode('');
      setNotice('Authenticator verification succeeded. Two-factor authentication is enabled. Save your recovery codes now.');
    } catch (err: unknown) {
      setError(describeError(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  async function regenerateCodes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!password) {
      setError('Enter your current password to replace your recovery codes.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const nextCodes = await generateTwoFactorBackupCodes(password);
      setPassword('');
      setRecoveryCodes(nextCodes);
      setNotice('New recovery codes were generated. All previous recovery codes are now invalid. Save this set now.');
    } catch (err: unknown) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function turnOff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!password) {
      setError('Enter your current password to disable two-factor authentication.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await disableTwoFactor(password);
      await refreshSession();
      setPassword('');
      setRecoveryCodes(null);
      setNotice('Two-factor authentication is disabled.');
    } catch (err: unknown) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="two-factor-heading"
      className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5"
    >
      <h2 id="two-factor-heading" className="text-sm font-bold text-[color:var(--color-ink)]">
        Two-factor authentication
      </h2>
      <p className="mt-1 text-xs text-[color:var(--color-muted)]">
        Status: <strong className="text-[color:var(--color-ink)]">{enabled ? 'Enabled' : 'Not enabled'}</strong>
      </p>
      <p className="mt-2 text-xs text-[color:var(--color-muted)]">
        Authenticator codes require the authenticator app. Email codes are available as a sign-in alternative after 2FA is enabled.
      </p>

      {notice && (
        <div role="status" className="mt-4 flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-success-bg)] p-3 text-xs text-[color:var(--color-success-ink)]">
          <CheckCircleIcon size={16} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div role="alert" className="mt-4 flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)]">
          <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!enabled && !enrollment && (
        <form onSubmit={beginEnrollment} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs font-semibold text-[color:var(--color-ink)]">
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm"
            />
          </label>
          <button type="submit" disabled={busy} className="h-11 rounded-[8px] bg-[color:var(--color-accent)] px-4 text-xs font-semibold text-[color:var(--color-on-accent)] disabled:opacity-60">
            {busy ? 'Preparing…' : 'Set up authenticator'}
          </button>
        </form>
      )}

      {enrollment && (
        <div className="mt-4 space-y-4">
          <div className="rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] p-3">
            <h3 className="text-xs font-bold text-[color:var(--color-ink)]">1. Add Everybuy to your authenticator</h3>
            <p className="mt-1 text-xs text-[color:var(--color-muted)]">
              Import this setup URI in your authenticator app. It contains your private TOTP secret; keep it to yourself.
            </p>
            <code className="mt-2 block break-all rounded bg-[color:var(--color-surface)] p-2 text-[11px] text-[color:var(--color-ink)]" data-sensitive="totp-uri">
              {enrollment.totpURI}
            </code>
          </div>

          <form onSubmit={confirmEnrollment} className="space-y-3">
            <label className="block text-xs font-semibold text-[color:var(--color-ink)]">
              2. Enter the 6-digit code from your app
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-2 h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-center text-lg tracking-[0.35em]"
              />
            </label>
            <button type="submit" disabled={busy} className="h-11 rounded-[8px] bg-[color:var(--color-accent)] px-4 text-xs font-semibold text-[color:var(--color-on-accent)] disabled:opacity-60">
              {busy ? 'Verifying…' : 'Verify and enable 2FA'}
            </button>
            <button type="button" disabled={busy} onClick={() => { setEnrollment(null); setCode(''); setError(null); }} className="ml-3 h-11 px-3 text-xs font-semibold text-[color:var(--color-muted)] disabled:opacity-60">
              Cancel setup
            </button>
          </form>

          <div className="rounded-[8px] border border-[color:var(--color-warning-ink)] bg-[color:var(--color-warning-bg)] p-3">
            <h3 className="text-xs font-bold text-[color:var(--color-warning-ink)]">Recovery codes</h3>
            <p className="mt-1 text-xs text-[color:var(--color-warning-ink)]">Save these codes somewhere private. Each one can be used once.</p>
            <RecoveryCodeList codes={enrollment.backupCodes} />
          </div>
        </div>
      )}

      {recoveryCodes && !enrollment && (
        <div className="mt-4 rounded-[8px] border border-[color:var(--color-warning-ink)] bg-[color:var(--color-warning-bg)] p-3">
          <h3 className="text-xs font-bold text-[color:var(--color-warning-ink)]">Save your recovery codes</h3>
          <p className="mt-1 text-xs text-[color:var(--color-warning-ink)]">They are shown only after generation. Previous codes stop working when you regenerate them.</p>
          <RecoveryCodeList codes={recoveryCodes} />
          <button type="button" onClick={() => setRecoveryCodes(null)} className="mt-2 h-10 text-xs font-semibold text-[color:var(--color-warning-ink)] underline">I saved these codes</button>
        </div>
      )}

      {enabled && !enrollment && (
        <div className="mt-4 space-y-4">
          <form onSubmit={regenerateCodes} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-xs font-semibold text-[color:var(--color-ink)]">
              Current password to replace recovery codes
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm"
              />
            </label>
            <button type="submit" disabled={busy} className="h-11 rounded-[8px] border border-[color:var(--color-border)] px-4 text-xs font-semibold disabled:opacity-60">
              {busy ? 'Working…' : 'Generate new recovery codes'}
            </button>
          </form>
          <form onSubmit={turnOff} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-xs font-semibold text-[color:var(--color-ink)]">
              Current password to disable 2FA
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm"
              />
            </label>
            <button type="submit" disabled={busy} className="h-11 rounded-[8px] border border-[color:var(--color-danger-ink)] px-4 text-xs font-semibold text-[color:var(--color-danger-ink)] disabled:opacity-60">
              {busy ? 'Working…' : 'Disable 2FA'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

function RecoveryCodeList({ codes }: { codes: string[] }) {
  return (
    <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Recovery codes" data-sensitive="backup-codes">
      {codes.map((recoveryCode) => (
        <li key={recoveryCode} className="rounded bg-[color:var(--color-surface)] px-2 py-1 text-center font-mono text-xs text-[color:var(--color-ink)]">
          {recoveryCode}
        </li>
      ))}
    </ul>
  );
}
