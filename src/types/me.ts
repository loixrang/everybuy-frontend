import type { StaffRole } from './staff';

/**
 * `GET /api/v1/me` (StaffGuard) returns an **array** with one item.
 * `404`/`403` mean the signed-in user has no active staff record.
 */
export interface Me {
  userId: string;
  staffId: string;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
}
