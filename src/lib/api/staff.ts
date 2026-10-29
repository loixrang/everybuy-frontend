import { apiFetch } from './client';
import type {
  AcceptInvitationResult,
  CreatedStaff,
  InvitationPreview,
  InviteStaffResult,
  StaffInvitation,
  StaffMember,
  UpdateStaffInput,
} from '../../types/staff';

/**
 * List shop members from GET /api/v1/staff (StaffGuard + OwnerGuard).
 * Returns name, email, role, active flag and join date. Answers 404 when no
 * staff rows exist and 403 for non-owners.
 */
export async function fetchStaff(): Promise<StaffMember[]> {
  const result = await apiFetch<StaffMember[]>('/api/v1/staff');
  return Array.isArray(result) ? result : [];
}

/**
 * Update a member's role or active flag
 * (`PATCH /api/v1/staff/:staffId`, OwnerGuard).
 * At least one field is required; the backend rejects an empty body with 409.
 * The backend returns the updated staff row array.
 */
export async function updateStaff(
  staffId: string,
  input: UpdateStaffInput,
): Promise<StaffMember[]> {
  const result = await apiFetch<StaffMember[]>(
    `/api/v1/staff/${encodeURIComponent(staffId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
  return Array.isArray(result) ? result : [];
}

/**
 * Invite a staff member by email (`POST /api/v1/staff/invite`, OwnerGuard).
 * The backend emails a one-time link; it needs `STAFF_INVITE_PREVIEW_URL`
 * configured, otherwise it answers 500.
 */
export async function inviteStaff(input: {
  name: string;
  email: string;
}): Promise<InviteStaffResult> {
  return apiFetch<InviteStaffResult>('/api/v1/staff/invite', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Create a staff account directly (`POST /api/v1/staff`, OwnerGuard).
 * The owner chooses the initial password; the backend sends a verification
 * email before the account can sign in.
 */
export async function createStaffAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<CreatedStaff> {
  return apiFetch<CreatedStaff>('/api/v1/staff', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * List staff invitations (`GET /api/v1/staff/invitations`, OwnerGuard).
 * Backend quirk: `viewInvite()` returns a single invitation row (or nothing),
 * not an array, so both shapes are normalised here.
 */
export async function fetchStaffInvitations(): Promise<StaffInvitation[]> {
  const result = await apiFetch<StaffInvitation | StaffInvitation[] | null>(
    '/api/v1/staff/invitations',
  );
  if (Array.isArray(result)) return result;
  return result ? [result] : [];
}

/** Revoke a pending invitation (`DELETE /api/v1/staff/invitations/:id`, OwnerGuard). */
export async function deleteStaffInvitation(
  invitationId: string,
): Promise<StaffInvitation> {
  return apiFetch<StaffInvitation>(
    `/api/v1/staff/invitations/${encodeURIComponent(invitationId)}`,
    { method: 'DELETE' },
  );
}

/**
 * Read an invitation by its secret token
 * (`GET /api/v1/staff/invite/preview?token=…`, public).
 */
export async function previewStaffInvitation(
  token: string,
): Promise<InvitationPreview> {
  const query = new URLSearchParams({ token });
  return apiFetch<InvitationPreview>(
    `/api/v1/staff/invite/preview?${query.toString()}`,
  );
}

/**
 * Accept an invitation and create the account
 * (`POST /api/v1/staff/invite/accept`, public). The token is the credential.
 */
export async function acceptStaffInvitation(input: {
  token: string;
  password: string;
}): Promise<AcceptInvitationResult> {
  return apiFetch<AcceptInvitationResult>('/api/v1/staff/invite/accept', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
