import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/auth/auth-context';
import { useTheme } from '../../lib/hooks/useTheme';
import { updateMyName } from '../../lib/api/me';
import { ApiError } from '../../lib/api/client';
import { formatShortDate } from '../../lib/utils/format';
import { TeamSection } from '../../components/settings/TeamSection';
import { ShopSettingsSection } from '../../components/settings/ShopSettingsSection';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  MoonIcon,
  RefreshCwIcon,
  SlidersIcon,
  SunIcon,
  XIcon,
} from '../../components/ui/Icons';

interface Notice {
  tone: 'success' | 'error';
  message: string;
}

export function SettingsPage() {
  const { user, me, isOwner, refreshMe, refreshSession, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [notice, setNotice] = useState<Notice | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const currentName = me?.name ?? user?.name ?? '';
  // `null` means "no unsaved edit", so the field follows the loaded profile
  // without an effect that would fight the user's typing.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const nameValue = nameDraft ?? currentName;

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      navigate('/signin', { replace: true });
    } catch (err: unknown) {
      setNotice({
        tone: 'error',
        message:
          err instanceof ApiError
            ? err.message
            : 'Unable to sign out. Check your connection and try again.',
      });
    } finally {
      setSigningOut(false);
    }
  }

  async function handleSaveName(event: React.FormEvent) {
    event.preventDefault();
    if (savingName) return;

    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameError('Enter your name.');
      return;
    }
    if (trimmed.length > 120) {
      setNameError('Keep your name to 120 characters or fewer.');
      return;
    }

    setSavingName(true);
    setNameError(null);
    setNotice(null);
    try {
      await updateMyName(trimmed);
      await Promise.all([refreshSession(), refreshMe()]);
      setNameDraft(null);
      setNotice({ tone: 'success', message: 'Your name was updated.' });
    } catch (err: unknown) {
      setNameError(
        err instanceof ApiError
          ? err.message
          : 'Unable to save your name. Check your connection and try again.',
      );
    } finally {
      setSavingName(false);
    }
  }

  const displayName = me?.name?.trim() || user?.name?.trim() || user?.email || 'Signed in';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
          Settings
        </h1>
        <p className="text-sm text-[color:var(--color-muted)] mt-1">
          Your account, the shop, appearance and team access.
        </p>
      </div>

      {notice && (
        <div
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={`flex items-start justify-between gap-3 rounded-[12px] border border-[color:var(--color-border)] p-4 ${
            notice.tone === 'success'
              ? 'bg-[color:var(--color-success-bg)]'
              : 'bg-[color:var(--color-danger-bg)]'
          }`}
        >
          <div className="flex items-start gap-3">
            {notice.tone === 'success' ? (
              <CheckCircleIcon
                size={20}
                className="shrink-0 mt-0.5 text-[color:var(--color-success-ink)]"
              />
            ) : (
              <AlertCircleIcon
                size={20}
                className="shrink-0 mt-0.5 text-[color:var(--color-danger-ink)]"
              />
            )}
            <p
              className={`text-sm ${
                notice.tone === 'success'
                  ? 'text-[color:var(--color-success-ink)]'
                  : 'text-[color:var(--color-danger-ink)]'
              }`}
            >
              {notice.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="shrink-0 text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] transition-colors"
          >
            <XIcon size={16} />
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="profile-heading"
          className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5"
        >
          <h2
            id="profile-heading"
            className="text-sm font-bold text-[color:var(--color-ink)]"
          >
            Profile
          </h2>
          <p className="text-xs text-[color:var(--color-muted)] mt-1">
            Read from your Everybuy account.
          </p>

          <form className="mt-4 space-y-3" onSubmit={handleSaveName} noValidate>
            <div>
              <label
                htmlFor="profile-name"
                className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1"
              >
                Display name
              </label>
              <div className="flex gap-2">
                <input
                  id="profile-name"
                  type="text"
                  value={nameValue}
                  maxLength={120}
                  onChange={(event) => {
                    setNameDraft(event.target.value);
                    setNameError(null);
                  }}
                  className="flex-1 min-w-0 h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)]"
                />
                <button
                  type="submit"
                  disabled={
                    savingName || nameValue.trim() === currentName
                  }
                  className="h-11 px-4 rounded-[8px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] text-xs font-semibold hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {savingName ? 'Saving…' : 'Save'}
                </button>
              </div>
              {nameError && (
                <p className="text-xs text-[color:var(--color-danger-ink)] mt-1">
                  {nameError}
                </p>
              )}
            </div>
          </form>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-[color:var(--color-muted)]">Email</dt>
              <dd className="font-semibold text-[color:var(--color-ink)] text-right break-all">
                {me?.email ?? user?.email ?? '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[color:var(--color-muted)]">Role</dt>
              <dd>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-semibold ${
                    isOwner
                      ? 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)]'
                      : 'bg-[color:var(--color-subtle)] text-[color:var(--color-muted)]'
                  }`}
                >
                  {me?.role ?? 'Unknown'}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[color:var(--color-muted)]">Staff access</dt>
              <dd className="font-semibold text-[color:var(--color-ink)]">
                {me ? (me.active ? 'Active' : 'Inactive') : 'No staff record'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[color:var(--color-muted)]">Email status</dt>
              <dd>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-semibold ${
                    user?.emailVerified
                      ? 'bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]'
                      : 'bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-ink)]'
                  }`}
                >
                  {user?.emailVerified ? 'Verified' : 'Not verified'}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[color:var(--color-muted)]">Member since</dt>
              <dd className="font-semibold text-[color:var(--color-ink)]">
                {formatShortDate(user?.createdAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[color:var(--color-muted)]">Two-factor</dt>
              <dd className="font-semibold text-[color:var(--color-ink)]">
                {user?.twoFactorEnabled ? 'Enabled' : 'Not enabled'}
              </dd>
            </div>
          </dl>

          <div className="mt-4 pt-4 border-t border-[color:var(--color-border)]">
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-[color:var(--color-accent-ink)] hover:underline underline-offset-2"
            >
              Send a password reset link
            </Link>
            <p className="text-[11px] text-[color:var(--color-muted)] mt-1">
              The reset link expires after one hour and signs out other sessions.
              Changing your email address is not available in this release.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="appearance-heading"
          className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5"
        >
          <h2
            id="appearance-heading"
            className="text-sm font-bold text-[color:var(--color-ink)]"
          >
            Appearance
          </h2>
          <p className="text-xs text-[color:var(--color-muted)] mt-1">
            Applies to this device and is saved in this browser.
          </p>

          <div
            role="group"
            aria-label="Theme"
            className="mt-4 grid grid-cols-2 gap-2"
          >
            <ThemeOption
              label="Light"
              icon={<SunIcon size={16} />}
              active={theme === 'light'}
              onClick={() => setTheme('light')}
            />
            <ThemeOption
              label="Dark"
              icon={<MoonIcon size={16} />}
              active={theme === 'dark'}
              onClick={() => setTheme('dark')}
            />
          </div>

          <div className="mt-5 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--color-ink)]">
              <SlidersIcon size={14} />
              Preferences
            </div>
            <p className="text-[11px] text-[color:var(--color-muted)] mt-1">
              The backend stores shop name, currency, timezone and receipt footer
              only. Notification and device preferences are not stored, so they
              are not shown here.
            </p>
          </div>
        </section>
      </div>

      <ShopSettingsSection canEdit={isOwner} />

      <TeamSection currentUserId={me?.userId ?? user?.id ?? null} />

      <section
        aria-labelledby="session-heading"
        className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5"
      >
        <h2
          id="session-heading"
          className="text-sm font-bold text-[color:var(--color-ink)]"
        >
          Session
        </h2>
        <p className="text-xs text-[color:var(--color-muted)] mt-1">
          Sessions last up to seven days and are refreshed while you use the app.
          Signing out revokes this session on the server.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
          <button
            type="button"
            onClick={() => {
              void refreshSession();
              void refreshMe();
            }}
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
          >
            <RefreshCwIcon size={16} />
            Refresh profile
          </button>
        </div>
        <p className="text-[11px] text-[color:var(--color-muted)] mt-2">
          Signed in as {displayName}
        </p>
      </section>
    </div>
  );
}

function ThemeOption({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-2 h-11 rounded-[8px] border text-sm font-semibold transition-colors ${
        active
          ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)]'
          : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
