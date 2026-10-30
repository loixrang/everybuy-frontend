import { useEffect, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  disableTwoFactor,
  enableTwoFactorTotp,
  generateTwoFactorBackupCodes,
  verifyTwoFactorTotp,
} from '../../lib/api/auth';
import { ApiError } from '../../lib/api/client';
import { copyText, downloadTextFile } from '../../lib/browser-files';
import { formatTotpSecret, parseTotpSetupUri } from '../../lib/totp';
import type { TOTPEnrollmentResponse } from '../../types/auth';
import { AlertCircleIcon, CheckCircleIcon } from '../ui/Icons';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface TwoFactorSettingsProps {
  enabled: boolean;
  refreshSession: () => Promise<void>;
}

type DialogAction = 'recovery' | 'disable';
type CopyTarget = 'setup-key' | 'recovery-codes';

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
    if (error.status === 401) {
      return 'Your session expired. Sign in again to change security settings.';
    }
    return error.message || 'The security change could not be completed.';
  }
  return 'Cannot reach the authentication server. Check your connection and try again.';
}

function recoveryCodesFile(codes: string[]): string {
  return [
    'Everybuy recovery codes',
    `Generated ${new Date().toLocaleString('en-GB')}`,
    '',
    'Each code can be used once. Keep this file private.',
    'Generating new codes invalidates every code in this file.',
    '',
    ...codes,
    '',
  ].join('\n');
}

/**
 * Owner-only authenticator-app (TOTP) management. The backend keeps enrollment
 * pending until `/two-factor/verify-totp` accepts a real code; the QR and
 * backup codes therefore stay in component memory and are cleared as soon as
 * enrollment finishes or is cancelled.
 */
export function TwoFactorSettings({ enabled, refreshSession }: TwoFactorSettingsProps) {
  // Tracks the state confirmed by the backend for this page. The session
  // refresh below updates the shared user object, but the page must stay
  // correct even if that read fails after a successful change.
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [enrollment, setEnrollment] = useState<TOTPEnrollmentResponse | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogAction | null>(null);
  const [dialogPassword, setDialogPassword] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const [codesAcknowledged, setCodesAcknowledged] = useState(false);

  const setup = enrollment ? parseTotpSetupUri(enrollment.totpURI) : null;

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  function clearEnrollment() {
    setEnrollment(null);
    setCode('');
    setPassword('');
    setSetupOpen(false);
    setError(null);
  }

  function openDialog(action: DialogAction) {
    if (busy) return;
    setDialog(action);
    setDialogPassword('');
    setDialogError(null);
    setError(null);
    setNotice(null);
  }

  function closeDialog() {
    if (busy) return;
    setDialog(null);
    setDialogPassword('');
    setDialogError(null);
  }

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
      setCode('');
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
      setIsEnabled(true);
      setRecoveryCodes(enrollment.backupCodes);
      setCodesAcknowledged(false);
      setEnrollment(null);
      setSetupOpen(false);
      setCode('');
      setPassword('');
      setNotice('Authenticator app 2FA is enabled. Save the recovery codes below before leaving this page.');
      // The enrollment already succeeded. A failed session read must not
      // replace the recovery-code screen with an error.
      void refreshSession();
    } catch (err: unknown) {
      setError(describeError(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  async function regenerateCodes() {
    if (busy) return;
    if (!dialogPassword) {
      setDialogError('Enter your current password to replace your recovery codes.');
      return;
    }
    setBusy(true);
    setDialogError(null);
    try {
      const nextCodes = await generateTwoFactorBackupCodes(dialogPassword);
      setRecoveryCodes(nextCodes);
      setCodesAcknowledged(false);
      setDialog(null);
      setDialogPassword('');
      setError(null);
      setNotice('New recovery codes were generated. Every previous recovery code is now invalid.');
    } catch (err: unknown) {
      setDialogError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (busy) return;
    if (!dialogPassword) {
      setDialogError('Enter your current password to disable the authenticator app.');
      return;
    }
    setBusy(true);
    setDialogError(null);
    try {
      await disableTwoFactor(dialogPassword);
      setIsEnabled(false);
      setDialog(null);
      setDialogPassword('');
      setRecoveryCodes(null);
      setCodesAcknowledged(false);
      setEnrollment(null);
      setCode('');
      setPassword('');
      setSetupOpen(false);
      setError(null);
      setNotice('Authenticator app 2FA is disabled. Registered passkeys are not affected.');
      void refreshSession();
    } catch (err: unknown) {
      setDialogError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function copySetupKey() {
    if (!setup) return;
    try {
      await copyText(setup.secret);
      setCopied('setup-key');
      setError(null);
    } catch {
      setError('Copy failed. Select the setup key manually or scan the QR code.');
    }
  }

  async function copyRecoveryCodes() {
    if (!recoveryCodes) return;
    try {
      await copyText(recoveryCodes.join('\n'));
      setCopied('recovery-codes');
      setError(null);
    } catch {
      setError('Copy failed. Select the codes manually or download them.');
    }
  }

  function downloadRecoveryCodes() {
    if (!recoveryCodes) return;
    downloadTextFile('everybuy-recovery-codes.txt', recoveryCodesFile(recoveryCodes));
  }

  function acknowledgeRecoveryCodes() {
    if (!codesAcknowledged) return;
    setRecoveryCodes(null);
    setCodesAcknowledged(false);
    setCopied(null);
    setNotice('Recovery codes hidden. Generate a new set if you need to save them again.');
  }

  return (
    <section
      aria-labelledby="two-factor-heading"
      className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5"
    >
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <h2 id="two-factor-heading" className="text-sm font-bold text-[color:var(--color-ink)]">
          Authenticator app
        </h2>
        <span
          className={`inline-flex shrink-0 items-center rounded-[4px] px-2 py-0.5 text-[11px] font-semibold ${
            isEnabled
              ? 'bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]'
              : 'bg-[color:var(--color-subtle)] text-[color:var(--color-muted)]'
          }`}
        >
          {isEnabled ? 'Enabled' : 'Not enabled'}
        </span>
      </div>
      <p className="mt-1 text-xs text-[color:var(--color-muted)]">
        Use Google Authenticator, Microsoft Authenticator, Aegis, or another
        TOTP app for a six-digit sign-in code.
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

      {!isEnabled && !enrollment && (
        <div className="mt-4">
          <button
            type="button"
            aria-expanded={setupOpen}
            aria-controls="two-factor-setup-form"
            disabled={busy}
            onClick={() => {
              setSetupOpen((open) => !open);
              setPassword('');
              setError(null);
              setNotice(null);
            }}
            className="inline-flex h-11 items-center rounded-[8px] px-3 text-xs font-semibold text-[color:var(--color-accent-ink)] hover:bg-[color:var(--color-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)] disabled:opacity-60 sm:h-9"
          >
            {setupOpen ? 'Cancel setup' : 'Set up authenticator app'}
          </button>
          {setupOpen && (
            <form id="two-factor-setup-form" onSubmit={beginEnrollment} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
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
              <button type="submit" disabled={busy} className="h-11 w-full rounded-[8px] bg-[color:var(--color-accent)] px-4 text-xs font-semibold text-[color:var(--color-on-accent)] disabled:opacity-60 sm:w-auto">
                {busy ? 'Preparing…' : 'Continue'}
              </button>
            </form>
          )}
        </div>
      )}

      {enrollment && (
        <div className="mt-4 space-y-4">
          <div className="rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] p-3 sm:p-4">
            <h3 className="text-xs font-bold text-[color:var(--color-ink)]">
              1. Scan the QR code
            </h3>
            <p className="mt-1 text-xs text-[color:var(--color-muted)]">
              In your authenticator app, choose “Scan a QR code” and point the
              camera at this code. The code contains your private setup key.
            </p>

            <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="shrink-0 rounded-[8px] bg-white p-2">
                <QRCodeSVG
                  value={enrollment.totpURI}
                  size={184}
                  level="M"
                  marginSize={2}
                  bgColor="#ffffff"
                  fgColor="#111111"
                  title="Everybuy authenticator setup QR code"
                  className="h-auto w-[184px] max-w-full"
                />
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-xs font-semibold text-[color:var(--color-ink)]">
                  Can&rsquo;t scan? Enter this setup key manually.
                </p>
                {setup ? (
                  <>
                    {setup.issuer && (
                      <p className="mt-1 text-[11px] text-[color:var(--color-muted)]">
                        Account: {setup.issuer}
                        {setup.account ? ` (${setup.account})` : ''}
                      </p>
                    )}
                    <code
                      data-sensitive="totp-secret"
                      className="mt-2 block break-all rounded bg-[color:var(--color-surface)] p-2 font-mono text-xs tracking-wide text-[color:var(--color-ink)]"
                    >
                      {formatTotpSecret(setup.secret)}
                    </code>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      <button
                        type="button"
                        onClick={() => void copySetupKey()}
                        className="inline-flex h-11 items-center rounded-[8px] border border-[color:var(--color-border)] px-3 text-xs font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface)] disabled:opacity-60 sm:h-9"
                      >
                        Copy setup key
                      </button>
                      {copied === 'setup-key' && (
                        <span role="status" className="text-[11px] font-semibold text-[color:var(--color-success-ink)]">
                          Copied
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-[color:var(--color-muted)]">
                      Time-based code, refreshed every {setup.period} seconds
                      {setup.digits !== 6 ? `, ${setup.digits} digits` : ''}.
                    </p>
                  </>
                ) : (
                  <p role="alert" className="mt-2 text-xs text-[color:var(--color-danger-ink)]">
                    The setup key could not be read from the server response.
                    Scan the QR code instead, or cancel and try again.
                  </p>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={confirmEnrollment} className="space-y-3">
            <div>
              <h3 className="text-xs font-bold text-[color:var(--color-ink)]">
                2. Verify the first code
              </h3>
              <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                Enter the six-digit code currently shown in the app. Enrollment
                is complete only after the server accepts it.
              </p>
            </div>
            <label className="block text-xs font-semibold text-[color:var(--color-ink)]">
              Authenticator code
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="submit" disabled={busy} className="h-11 w-full rounded-[8px] bg-[color:var(--color-accent)] px-4 text-xs font-semibold text-[color:var(--color-on-accent)] disabled:opacity-60 sm:w-auto">
                {busy ? 'Verifying…' : 'Verify and enable'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={clearEnrollment}
                className="inline-flex h-11 w-full items-center justify-center rounded-[8px] px-3 text-xs font-semibold text-[color:var(--color-muted)] disabled:opacity-60 sm:w-auto"
              >
                Cancel setup
              </button>
            </div>
          </form>
        </div>
      )}

      {recoveryCodes && !enrollment && (
        <div className="mt-4 rounded-[8px] border border-[color:var(--color-warning-ink)] bg-[color:var(--color-warning-bg)] p-3 sm:p-4">
          <h3 className="text-xs font-bold text-[color:var(--color-warning-ink)]">
            Save your recovery codes
          </h3>
          <p className="mt-1 text-xs text-[color:var(--color-warning-ink)]">
            Each code can be used once. This is the only time they are shown.
            Keep them somewhere private, away from your authenticator app.
          </p>
          <RecoveryCodeList codes={recoveryCodes} />

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void copyRecoveryCodes()}
              className="inline-flex h-11 items-center justify-center rounded-[8px] border border-[color:var(--color-warning-ink)] px-3 text-xs font-semibold text-[color:var(--color-warning-ink)] hover:bg-[color:var(--color-surface)] sm:h-9"
            >
              Copy codes
            </button>
            <button
              type="button"
              onClick={downloadRecoveryCodes}
              className="inline-flex h-11 items-center justify-center rounded-[8px] border border-[color:var(--color-warning-ink)] px-3 text-xs font-semibold text-[color:var(--color-warning-ink)] hover:bg-[color:var(--color-surface)] sm:h-9"
            >
              Download .txt
            </button>
            {copied === 'recovery-codes' && (
              <span role="status" className="self-center text-[11px] font-semibold text-[color:var(--color-success-ink)]">
                Copied
              </span>
            )}
          </div>

          <label className="mt-4 flex items-start gap-2 text-xs font-medium text-[color:var(--color-warning-ink)]">
            <input
              type="checkbox"
              checked={codesAcknowledged}
              onChange={(event) => setCodesAcknowledged(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              I have saved these recovery codes in a safe place. I understand
              they cannot be shown again.
            </span>
          </label>
          <button
            type="button"
            disabled={!codesAcknowledged}
            onClick={acknowledgeRecoveryCodes}
            className="mt-2 inline-flex h-11 items-center text-xs font-semibold text-[color:var(--color-warning-ink)] underline underline-offset-2 disabled:opacity-50"
          >
            I saved these codes
          </button>
        </div>
      )}

      {isEnabled && !enrollment && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-[color:var(--color-muted)]">
            Authenticator app 2FA is active. Sign-in asks for the current code
            after your password.
          </p>
          <p className="text-[11px] text-[color:var(--color-muted)]">
            Recovery codes were generated when 2FA was enabled. The API does not
            report how many unused codes remain, and existing codes cannot be
            displayed again.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={busy}
              onClick={() => openDialog('recovery')}
              className="inline-flex h-11 items-center justify-center rounded-[8px] border border-[color:var(--color-border)] px-3 text-xs font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)] disabled:opacity-60 sm:h-9"
            >
              Generate new recovery codes
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => openDialog('disable')}
              className="inline-flex h-11 items-center justify-center rounded-[8px] border border-[color:var(--color-danger-ink)] px-3 text-xs font-semibold text-[color:var(--color-danger-ink)] hover:bg-[color:var(--color-danger-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)] disabled:opacity-60 sm:h-9"
            >
              Disable authenticator app
            </button>
          </div>
        </div>
      )}

      {dialog && (
        <ConfirmDialog
          title={dialog === 'disable' ? 'Turn off authenticator app?' : 'Generate new recovery codes?'}
          description={
            dialog === 'disable' ? (
              <p>
                Sign-in will no longer ask for a code from your authenticator
                app. Your password and registered passkeys stay active. You can
                enable it again later.
              </p>
            ) : (
              <p>
                Every existing recovery code stops working immediately. The new
                set is shown once, so save it before leaving the page.
              </p>
            )
          }
          confirmLabel={dialog === 'disable' ? 'Disable authenticator app' : 'Generate new codes'}
          busyLabel={dialog === 'disable' ? 'Disabling…' : 'Generating…'}
          busy={busy}
          confirmDisabled={!dialogPassword}
          onConfirm={() => {
            if (dialog === 'disable') void turnOff();
            else void regenerateCodes();
          }}
          onCancel={closeDialog}
        >
          {dialogError && (
            <div role="alert" className="mb-3 flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)]">
              <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
              <span>{dialogError}</span>
            </div>
          )}
          <label className="block text-xs font-semibold text-[color:var(--color-ink)]">
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={dialogPassword}
              onChange={(event) => {
                setDialogPassword(event.target.value);
                setDialogError(null);
              }}
              className="mt-2 h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm"
            />
          </label>
        </ConfirmDialog>
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
