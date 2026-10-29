/**
 * GET /api/v1/audit (StaffGuard).
 * Every entry, newest first, not paginated. Currently only expense creation
 * writes here. `actor` falls back to the actor id, then "Unknown".
 */
export interface AuditEntry {
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  at: string;
  detail: Record<string, unknown> | null;
}
