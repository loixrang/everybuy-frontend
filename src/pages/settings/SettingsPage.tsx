import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/auth/auth-context';
import { useTheme } from '../../lib/hooks/useTheme';
import { fetchStaff } from '../../lib/api/staff';
import { ApiError } from '../../lib/api/client';
import { formatShortDate } from '../../lib/utils/format';
import type { CreatedStaff, StaffMember, StaffRole } from '../../types/staff';
import { StaffAccountModal } from '../../components/settings/StaffAccountModal';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  SlidersIcon,
  SunIcon,
  MoonIcon,
  UsersIcon,
  XIcon,
} from '../../components/ui/Icons';

type TeamState = 'loading' | 'ready' | 'owner-only' | 'error';

interface Notice {
  tone: 'success' | 'error';
  message: string;
}

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [team, setTeam] = useState<StaffMember[]>([]);
  const [teamState, setTeamState] = useState<TeamState>('loading');
  const [teamError, setTeamError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const members = await fetchStaff();
        if (ignore) return;
        setTeam(members);
        setTeamState('ready');
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiError && err.status === 403) {
          setTeamState('owner-only');
          return;
        }
        // The backend answers 404 when no staff rows exist; an empty team is
        // still a valid state for the owner who is signed in.
        if (err instanceof ApiError && err.status === 404) {
          setTeam([]);
          setTeamState('ready');
          return;
        }
        setTeamError(
          err instanceof ApiError
            ? err.message
            : 'Unable to reach the backend. Check that it is running and try again.',
        );
        setTeamState('error');
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const retryTeam = useCallback(() => {
    setTeamState('loading');
    setTeamError(null);
    setReloadKey((key) => key + 1);
  }, []);

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

  function handleInvited(email: string) {
    setModalOpen(false);
    setNotice({
      tone: 'success',
      message: `Invitation sent to ${email}. The link expires in 24 hours.`,
    });
  }

  function handleCreated(created: CreatedStaff) {
    setModalOpen(false);
    setTeam((members) => [
      ...members,
      {
        staffId: created.id,
        userId: created.userId,
        name: created.name,
        role: created.role,
      },
    ]);
    setTeamState('ready');
    setNotice({
      tone: 'success',
      message: `${created.name} was added. They must verify their email before signing in.`,
    });
  }

  const displayName = user?.name?.trim() || user?.email || 'Signed in';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
          Settings
        </h1>
        <p className="text-sm text-[color:var(--color-muted)] mt-1">
          Your account, appearance and team access.
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

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-[color:var(--color-muted)]">Name</dt>
              <dd className="font-semibold text-[color:var(--color-ink)] text-right">
                {displayName}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-[color:var(--color-muted)]">Email</dt>
              <dd className="font-semibold text-[color:var(--color-ink)] text-right break-all">
                {user?.email ?? '—'}
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

          <p className="text-[11px] text-[color:var(--color-muted)] mt-4">
            Changing your name, email or password is not available in this release.
          </p>
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
              More preferences need backend support
            </div>
            <p className="text-[11px] text-[color:var(--color-muted)] mt-1">
              Store name, currency display and notification settings are not stored
              by the backend yet, so they are not shown here.
            </p>
          </div>
        </section>
      </div>

      <section
        aria-labelledby="team-heading"
        className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between px-5 py-4 border-b border-[color:var(--color-border)]">
          <div>
            <h2
              id="team-heading"
              className="text-sm font-bold text-[color:var(--color-ink)]"
            >
              Team
            </h2>
            <p className="text-xs text-[color:var(--color-muted)] mt-1">
              Staff members can record stock, sales and customers. Only owners can
              manage the team.
            </p>
          </div>
          {teamState === 'ready' && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[8px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] text-xs font-semibold hover:bg-[color:var(--color-accent-hover)] transition-colors shrink-0"
            >
              <PlusIcon size={14} />
              Add staff
            </button>
          )}
        </div>

        {teamState === 'loading' && (
          <div className="p-5 space-y-3 animate-pulse" aria-busy="true">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="h-10 rounded-[6px] bg-[color:var(--color-subtle)]"
              />
            ))}
          </div>
        )}

        {teamState === 'owner-only' && (
          <div className="p-6 flex items-start gap-3">
            <UsersIcon
              size={20}
              className="shrink-0 mt-0.5 text-[color:var(--color-muted)]"
            />
            <div>
              <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                Owner access required
              </p>
              <p className="text-xs text-[color:var(--color-muted)] mt-1">
                You are signed in with staff access. Ask an owner to invite or manage
                team members.
              </p>
            </div>
          </div>
        )}

        {teamState === 'error' && (
          <div className="p-5 flex items-start gap-3">
            <AlertCircleIcon
              size={20}
              className="shrink-0 mt-0.5 text-[color:var(--color-danger-ink)]"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                Unable to load the team
              </p>
              <p className="text-xs text-[color:var(--color-muted)] mt-1">
                {teamError}
              </p>
            </div>
            <button
              type="button"
              onClick={retryTeam}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-[color:var(--color-border)] text-xs font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors shrink-0"
            >
              <RefreshCwIcon size={14} />
              Retry
            </button>
          </div>
        )}

        {teamState === 'ready' && team.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-sm font-semibold text-[color:var(--color-ink)]">
              No team members yet
            </p>
            <p className="text-xs text-[color:var(--color-muted)] mt-1">
              Add a staff member to let them record stock and sales.
            </p>
          </div>
        )}

        {teamState === 'ready' && team.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)]">
                    <th className="py-3 px-5 text-xs font-medium text-[color:var(--color-muted)]">
                      Name
                    </th>
                    <th className="py-3 px-5 text-xs font-medium text-[color:var(--color-muted)]">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-border)]">
                  {team.map((member) => (
                    <tr key={member.staffId}>
                      <td className="py-3 px-5 text-sm font-semibold text-[color:var(--color-ink)]">
                        <span className="inline-flex items-center gap-2">
                          {member.name}
                          {member.userId === user?.id && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)]">
                              You
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <RoleBadge role={member.role} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-[color:var(--color-border)]">
              {team.map((member) => (
                <li
                  key={member.staffId}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  <span className="min-w-0 text-sm font-semibold text-[color:var(--color-ink)] truncate">
                    {member.name}
                    {member.userId === user?.id && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)]">
                        You
                      </span>
                    )}
                  </span>
                  <RoleBadge role={member.role} />
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="px-5 py-3 border-t border-[color:var(--color-border)] text-[11px] text-[color:var(--color-muted)]">
          The team endpoint does not return member emails, and the backend has no
          endpoint to change a role or deactivate a member yet.
        </p>
      </section>

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
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          className="mt-4 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </section>

      {modalOpen && (
        <StaffAccountModal
          onClose={() => setModalOpen(false)}
          onCreated={handleCreated}
          onInvited={handleInvited}
        />
      )}
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

function RoleBadge({ role }: { role: StaffRole }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-semibold ${
        role === 'Owner'
          ? 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)]'
          : 'bg-[color:var(--color-subtle)] text-[color:var(--color-muted)]'
      }`}
    >
      {role}
    </span>
  );
}
