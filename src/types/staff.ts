/**
 * Verified staff shapes.
 *
 * Endpoints (global prefix `/api/v1`):
 * - GET  /staff                 -> StaffMember[] (StaffGuard + OwnerGuard)
 * - POST /staff                 -> CreatedStaff (OwnerGuard)
 * - POST /staff/invite          -> InviteStaffResult (OwnerGuard, sends email)
 * - GET  /staff/invite/preview  -> InvitationPreview (public, token credential)
 * - POST /staff/invite/accept   -> AcceptInvitationResult (public, token credential)
 */

/** Backend pg enum `staff_role`. */
export type StaffRole = 'Owner' | 'Staff';

export interface StaffMember {
  staffId: string;
  userId: string;
  name: string;
  role: StaffRole;
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

export interface InvitationPreview {
  name: string;
  email: string;
  expiresAt: string;
}

export interface AcceptInvitationResult {
  message: string;
  staff: {
    id: string;
    userId: string;
    role: StaffRole;
    active: boolean;
  };
}
