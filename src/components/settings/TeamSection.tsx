import { useCallback, useEffect, useState } from 'react';
import {
  deleteStaffInvitation,
  fetchStaff,
  fetchStaffInvitations,
  updateStaff,
} from '../../lib/api/staff';
import { ApiError } from '../../lib/api/client';
import {
  invitationStatusLabel,
  invitationStatusOf,
  isPendingInvitation,
  type InvitationDisplayStatus,
} from '../../lib/invitations';
import { formatShortDate } from '../../lib/utils/format';
import type {
  CreatedStaff,
  StaffInvitation,
  StaffMember,
  StaffRole,
} from '../../types/staff';
import { StaffAccountModal } from './StaffAccountModal';
import { SheetSelect } from '../ui/SheetSelect';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  UsersIcon,
  XIcon,
} from '../ui/Icons';

type LoadState = 'loading' | 'ready' | 'owner-only' | 'error';

interface TeamSectionProps {
  currentUserId: string | null;
}

export function TeamSection({ currentUserId }: TeamSectionProps) {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [teamState, setTeamState] = useState<LoadState>('loading');
  const [teamError, setTeamError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [invitationsLimited, setInvitationsLimited] = useState(false);
  const [pendingMember, setPendingMember] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [pendingInvite, setPendingInvite] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setTeamState('loading');
      setTeamError(null);
      setInvitationsError(null);
      setInvitationsLimited(false);

      try {
        const result = await fetchStaff();
        if (ignore) return;
        setMembers(result);
        setTeamState('ready');
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiError && err.status === 403) {
          setTeamState('owner-only');
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setMembers([]);
          setTeamState('ready');
        } else {
          setTeamError(
            err instanceof ApiError
              ? err.message
              : 'Unable to connect. Check your connection and try again.',
          );
          setTeamState('error');
          return;
        }
      }

      try {
        const invites = await fetchStaffInvitations();
        if (!ignore) setInvitations(invites);
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiError && err.status === 404) {
          setInvitations([]);
        } else if (err instanceof ApiError && err.status >= 500) {
          setInvitations([]);
          setInvitationsLimited(true);
        } else {
          setInvitationsError(
            err instanceof ApiError
              ? err.message
              : 'Invitations are unavailable.',
          );
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const retry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  function applyUpdated(updated: StaffMember[]) {
    if (updated.length === 0) {
      retry();
      return;
    }
    const next = updated[0];
    setMembers((current) =>
      current.map((member) =>
        member.staffId === next.staffId ? { ...member, ...next } : member,
      ),
    );
  }

  async function changeRole(member: StaffMember, role: StaffRole) {
    if (pendingMember || role === member.role) return;
    setPendingMember(member.staffId);
    setRowError(null);
    setNotice(null);
    try {
      const updated = await updateStaff(member.staffId, { role });
      applyUpdated(updated);
      setNotice(`${member.name} is now ${role === 'Owner' ? 'an owner' : 'staff'}.`);
      setEditingMemberId(null);
    } catch (err: unknown) {
      setRowError(
        err instanceof ApiError
          ? err.message
          : 'Unable to update the member. Check your connection and try again.',
      );
    } finally {
      setPendingMember(null);
    }
  }

  async function toggleActive(member: StaffMember) {
    if (pendingMember) return;
    const nextActive = !member.active;
    setPendingMember(member.staffId);
    setRowError(null);
    setNotice(null);
    try {
      const updated = await updateStaff(member.staffId, { active: nextActive });
      applyUpdated(updated);
      setNotice(
        `${member.name} was ${nextActive ? 'reactivated' : 'deactivated'}.`,
      );
      setEditingMemberId(null);
    } catch (err: unknown) {
      setRowError(
        err instanceof ApiError
          ? err.message
          : 'Unable to update the member. Check your connection and try again.',
      );
    } finally {
      setPendingMember(null);
    }
  }

  async function revokeInvitation(invitation: StaffInvitation) {
    if (pendingInvite) return;
    setPendingInvite(invitation.id);
    setRowError(null);
    setNotice(null);
    try {
      await deleteStaffInvitation(invitation.id);
      setInvitations((current) =>
        current.filter((candidate) => candidate.id !== invitation.id),
      );
      setNotice(`Invitation for ${invitation.email} was revoked.`);
    } catch (err: unknown) {
      setRowError(
        err instanceof ApiError
          ? err.message
          : 'Unable to revoke the invitation. Check your connection and try again.',
      );
    } finally {
      setPendingInvite(null);
    }
  }

  function handleCreated(created: CreatedStaff) {
    setModalOpen(false);
    setMembers((current) => [
      ...current,
      {
        staffId: created.id,
        userId: created.userId,
        name: created.name,
        email: created.email,
        role: created.role,
        active: created.active,
        createdAt: new Date().toISOString(),
      },
    ]);
    setTeamState('ready');
    setNotice(
      `${created.name} was added. They must verify their email before signing in.`,
    );
  }

  function handleInvited(email: string) {
    setModalOpen(false);
    setNotice(`Invitation sent to ${email}. The link expires in 24 hours.`);
    setReloadKey((key) => key + 1);
  }

  // The endpoint returns every invitation row, including accepted ones. Only
  // invitations still waiting for the person to accept belong in this section.
  const pendingInvitations = invitations.filter((invitation) =>
    isPendingInvitation(invitation),
  );

  return (
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
            Staff members can record stock, sales, customers and expenses. Only
            owners can manage the team.
          </p>
        </div>
        {teamState === 'ready' && (
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[8px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] text-xs font-semibold hover:bg-[color:var(--color-accent-hover)] transition-colors shrink-0 sm:h-10"
          >
            <PlusIcon size={14} />
            Add staff
          </button>
        )}
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 px-5 py-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-success-bg)]"
        >
          <div className="flex items-start gap-2">
            <CheckCircleIcon
              size={16}
              className="shrink-0 mt-0.5 text-[color:var(--color-success-ink)]"
            />
            <p className="text-xs text-[color:var(--color-success-ink)]">
              {notice}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="shrink-0 text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] transition-colors"
          >
            <XIcon size={14} />
          </button>
        </div>
      )}

      {rowError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 px-5 py-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)]"
        >
          <div className="flex items-start gap-2">
            <AlertCircleIcon
              size={16}
              className="shrink-0 mt-0.5 text-[color:var(--color-danger-ink)]"
            />
            <p className="text-xs text-[color:var(--color-danger-ink)]">
              {rowError}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRowError(null)}
            aria-label="Dismiss"
            className="shrink-0 text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] transition-colors"
          >
            <XIcon size={14} />
          </button>
        </div>
      )}

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
              You are signed in with staff access. Ask an owner to invite or
              manage team members.
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
            onClick={retry}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-[color:var(--color-border)] text-xs font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors shrink-0"
          >
            <RefreshCwIcon size={14} />
            Retry
          </button>
        </div>
      )}

      {teamState === 'ready' && members.length === 0 && (
        <div className="p-6 text-center">
          <p className="text-sm font-semibold text-[color:var(--color-ink)]">
            No team members yet
          </p>
          <p className="text-xs text-[color:var(--color-muted)] mt-1">
            Add a staff member to let them record stock and sales.
          </p>
        </div>
      )}

      {teamState === 'ready' && members.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)]">
                  <th className="py-3 px-5 text-xs font-medium text-[color:var(--color-muted)]">
                    Member
                  </th>
                  <th className="py-3 px-5 text-xs font-medium text-[color:var(--color-muted)]">
                    Role
                  </th>
                  <th className="py-3 px-5 text-xs font-medium text-[color:var(--color-muted)]">
                    Access
                  </th>
                  <th className="py-3 px-5 text-xs font-medium text-[color:var(--color-muted)]">
                    Joined
                  </th>
                  <th className="py-3 px-5 text-xs font-medium text-[color:var(--color-muted)] text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {members.map((member) => {
                  const isSelf = member.userId === currentUserId;
                  const busy = pendingMember === member.staffId;
                  return (
                    <tr key={member.staffId}>
                      <td className="py-3 px-5">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--color-ink)]">
                          {member.name}
                          {isSelf && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)]">
                              You
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-[color:var(--color-muted)] mt-0.5 break-all">
                          {member.email}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <RoleBadge role={member.role} />
                      </td>
                      <td className="py-3 px-5">
                        <AccessBadge active={member.active} />
                      </td>
                      <td className="py-3 px-5 text-sm text-[color:var(--color-muted)] whitespace-nowrap">
                        {formatShortDate(member.createdAt)}
                      </td>
                      <td className="py-3 px-5 text-right">
                        {!isSelf && (
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" aria-expanded={editingMemberId === member.staffId} aria-controls={`member-actions-${member.staffId}`} onClick={() => setEditingMemberId(editingMemberId === member.staffId ? null : member.staffId)} className="h-9 px-2 rounded-[6px] text-xs font-semibold text-[color:var(--color-accent-ink)] hover:bg-[color:var(--color-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]">
                              {editingMemberId === member.staffId ? 'Done' : 'Manage'}
                            </button>
                            <div id={`member-actions-${member.staffId}`} hidden={editingMemberId !== member.staffId} className={`${editingMemberId === member.staffId ? 'flex' : 'hidden'} items-center gap-2`}>
                                <label className="sr-only" htmlFor={`role-${member.staffId}`}>Role for {member.name}</label>
                                <SheetSelect id={`role-${member.staffId}`} label={`Role for ${member.name}`} value={member.role} disabled={busy} onChange={(value) => void changeRole(member, value as StaffRole)} options={[{ value: 'Staff', label: 'Staff' }, { value: 'Owner', label: 'Owner' }]} className="w-[130px] shrink-0" />
                                <button type="button" onClick={() => void toggleActive(member)} disabled={busy} className="h-9 px-2 rounded-[6px] text-xs font-semibold text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] disabled:opacity-60">
                                  {busy ? 'Saving…' : member.active ? 'Deactivate' : 'Reactivate'}
                                </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden divide-y divide-[color:var(--color-border)]">
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const busy = pendingMember === member.staffId;
              return (
                <li key={member.staffId} className="px-4 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[color:var(--color-ink)] truncate">
                        {member.name}
                        {isSelf && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)]">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[color:var(--color-muted)] truncate mt-0.5">
                        {member.email}
                      </p>
                    </div>
                    <AccessBadge active={member.active} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-[color:var(--color-muted)]">
                      Joined {formatShortDate(member.createdAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={member.role} />
                      {!isSelf && <>
                        <button type="button" aria-expanded={editingMemberId === member.staffId} aria-controls={`member-mobile-actions-${member.staffId}`} onClick={() => setEditingMemberId(editingMemberId === member.staffId ? null : member.staffId)} className="inline-flex h-11 items-center px-2 text-xs font-semibold text-[color:var(--color-accent-ink)] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--color-accent)] sm:h-9">
                          {editingMemberId === member.staffId ? 'Done' : 'Manage'}
                        </button>
                        <div id={`member-mobile-actions-${member.staffId}`} hidden={editingMemberId !== member.staffId} className={`${editingMemberId === member.staffId ? 'flex' : 'hidden'} flex-wrap items-center gap-2`}>
                          <label className="sr-only" htmlFor={`role-m-${member.staffId}`}>Role for {member.name}</label>
                          <SheetSelect id={`role-m-${member.staffId}`} label={`Role for ${member.name}`} value={member.role} disabled={busy} onChange={(value) => void changeRole(member, value as StaffRole)} options={[{ value: 'Staff', label: 'Staff' }, { value: 'Owner', label: 'Owner' }]} className="w-[130px] shrink-0" />
                          <button type="button" onClick={() => void toggleActive(member)} disabled={busy} className="h-11 rounded-[6px] px-2 text-xs font-semibold text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] disabled:opacity-60 sm:h-9">{busy ? 'Saving…' : member.active ? 'Deactivate' : 'Reactivate'}</button>
                        </div>
                      </>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="px-5 py-4 border-t border-[color:var(--color-border)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-[color:var(--color-ink)]">
              Pending invitations
            </h3>
            <p className="text-[11px] text-[color:var(--color-muted)] mt-0.5">
              Only invitations waiting to be accepted are shown. They expire
              after 24 hours.
            </p>
          </div>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1.5 h-11 px-2.5 rounded-[6px] border border-[color:var(--color-border)] text-[11px] font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors sm:h-8"
          >
            <RefreshCwIcon size={12} />
            Refresh
          </button>
        </div>

        {invitationsError ? (
          <p className="text-xs text-[color:var(--color-danger-ink)] mt-2">
            {invitationsError}
          </p>
        ) : pendingInvitations.length === 0 ? (
          <p className="text-xs text-[color:var(--color-muted)] mt-2">
            {invitationsLimited
              ? 'Pending invitations could not be displayed. Refresh to try again.'
              : 'No pending invitations.'}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-[color:var(--color-border)]">
            {pendingInvitations.map((invitation) => {
              const status = invitationStatusOf(invitation);
              return (
                <li
                  key={invitation.id}
                  className="py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[color:var(--color-ink)] truncate">
                      {invitation.name} · {invitation.email}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <InvitationStatusBadge status={status} />
                      <span className="text-[11px] text-[color:var(--color-muted)]">
                        Staff · expires {formatShortDate(invitation.expiresAt)}
                      </span>
                    </div>
                  </div>
                  {status !== 'accepted' && (
                    <button
                      type="button"
                      onClick={() => void revokeInvitation(invitation)}
                      disabled={pendingInvite === invitation.id}
                      className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-[6px] border border-[color:var(--color-border)] text-[11px] font-semibold text-[color:var(--color-danger-ink)] hover:bg-[color:var(--color-danger-bg)] transition-colors disabled:opacity-60 sm:h-8 sm:w-auto sm:px-3"
                    >
                      {pendingInvite === invitation.id ? 'Revoking…' : 'Revoke'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

      </div>

      <p className="px-5 py-3 border-t border-[color:var(--color-border)] text-[11px] text-[color:var(--color-muted)]">
        Ask another owner to change your access.
      </p>

      {modalOpen && (
        <StaffAccountModal
          onClose={() => setModalOpen(false)}
          onCreated={handleCreated}
          onInvited={handleInvited}
        />
      )}
    </section>
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

function AccessBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-semibold ${
        active
          ? 'bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]'
          : 'bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-ink)]'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function InvitationStatusBadge({ status }: { status: InvitationDisplayStatus }) {
  const tone =
    status === 'pending'
      ? 'bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-ink)]'
      : status === 'accepted'
        ? 'bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]'
        : status === 'processing'
          ? 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)]'
          : 'bg-[color:var(--color-subtle)] text-[color:var(--color-muted)]';

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold ${tone}`}
    >
      {invitationStatusLabel(status)}
    </span>
  );
}
