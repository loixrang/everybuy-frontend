/**
 * Verified staff shapes.
 *
 * Endpoints (global prefix `/api/v1`):
 * - GET    /staff                     -> StaffMember[] (StaffGuard + OwnerGuard)
 * - POST   /staff                     -> CreatedStaff (OwnerGuard)
 * - PATCH  /staff/:staffId            -> StaffRow[] (OwnerGuard)
 * - POST   /staff/invite              -> InviteStaffResult (OwnerGuard, sends email)
 * - GET    /staff/invitations         -> StaffInvitation[] (OwnerGuard)
 * - DELETE /staff/invitations/:id     -> deleted invitation row (OwnerGuard)
 * - GET    /staff/invite/preview      -> InvitationPreview (public, token credential)
 * - POST   /staff/invite/accept       -> AcceptInvitationResult (public, token credential)
 *
 * Backend quirk: `viewInvite()` selects the whole `staff_invitations` table, so
 * the "list" endpoint returns accepted rows too and the response still carries
 * `tokenHash` (a hash, not a usable credential; the frontend ignores it).
 */

/** Backend pg enum `staff_role`. */
export type StaffRole = 'Owner' | 'Staff';

export interface StaffMember {
  staffId: string;
  userId: string;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
}

/** Body of PATCH /staff/:staffId. At least one field is required (409 otherwise). */
export interface UpdateStaffInput {
  role?: StaffRole;
  active?: boolean;
}

export interface InviteStaffResult {
  message: string;
  email: string;
  expiresAt: string;
}

export interface CreatedStaff {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
}

/** Backend pg enum `staff_invitation_status`. */
export type InvitationStatus = 'pending' | 'processing' | 'accepted';

/**
 * Row from GET /staff/invitations. The backend also returns `tokenHash`; it is
 * omitted from this type because the frontend never reads or displays it.
 */
export interface StaffInvitation {
  id: string;
  name: string;
  email: string;
  status: InvitationStatus;
  createdBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface InvitationPreview {
  name: string;
  email: string;
  expiresAt: string;
}

/**
 * Response from POST /staff/invite/accept. `finalize()` returns the created
 * staff row plus the deleted invitation; the frontend only needs the account
 * summary and must not display or retain the deleted invitation row.
 */
export interface AcceptInvitationResult {
  message: string;
  staff: {
    staffId: string;
    userId: string;
    name: string;
    email: string;
    role: StaffRole;
    active: boolean;
  };
}
