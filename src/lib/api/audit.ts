import { apiFetch } from './client';
import type { AuditEntry } from '../../types/audit';

/**
 * Fetch the audit log (`GET /api/v1/audit`, StaffGuard).
 * Newest first, not paginated. Currently only expense creation is recorded.
 */
export async function fetchAuditLog(): Promise<AuditEntry[]> {
  const result = await apiFetch<AuditEntry[]>('/api/v1/audit');
  return Array.isArray(result) ? result : [];
}
