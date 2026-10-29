import { apiFetch } from './client';
import type {
  AcceptInvitationResult,
  CreatedStaff,
  InvitationPreview,
  InviteStaffResult,
  StaffMember,
} from '../../types/staff';

/**
 * List shop members from GET /api/v1/staff (StaffGuard + OwnerGuard).
 * The backend returns `{ staffId, userId, name, role }` only — no email,
 * active flag, or timestamps. It answers 404 when no staff rows exist and
 * 403 for non-owners.
 */
export async function fetchStaff(): Promise<StaffMember[]> {
  return apiFetch<StaffMember[]>('/api/v1/staff');
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
