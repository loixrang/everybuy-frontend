/**
 * Verified staff shapes.
 *
 * Endpoints (global prefix `/api/v1`):
 * - GET    /staff                     -> StaffMember[] (StaffGuard + OwnerGuard)
 * - POST   /staff                     -> CreatedStaff (OwnerGuard)
 * - PATCH  /staff/:staffId            -> StaffRow[] (OwnerGuard)
 * - POST   /staff/invite              -> InviteStaffResult (OwnerGuard, sends email)
 * - GET    /staff/invitations         -> a single invitation row (OwnerGuard)
 * - DELETE /staff/invitations/:id     -> deleted invitation row (OwnerGuard)
 * - GET    /staff/invite/preview      -> InvitationPreview (public, token credential)
 * - POST   /staff/invite/accept       -> AcceptInvitationResult (public, token credential)
 *
 * Backend quirk: `viewInvite()` selects `.limit(1)`-style (`const [invite]`),
 * so the "list" endpoint currently returns one invitation object or an empty
 * body. The frontend accepts either a single object or an array.
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

/** Row from GET /staff/invitations. `tokenHash` is never displayed. */
export interface StaffInvitation {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'processing' | 'accepted' | string;
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

export interface AcceptInvitationResult {
  message: string;
  staff: {
    id: string;
    userId: string;
    role: StaffRole;
    active: boolean;
  };
}
