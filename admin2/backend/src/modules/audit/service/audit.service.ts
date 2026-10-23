// ============================================================
// Audit — Service
//
// Provides:
//   - list() for the audit log page (Owner only)
//   - log() for other modules to record audit entries
// ============================================================

import { auditRepository } from '../repository/audit.repository.js';

export class AuditService {
  async list(salonId: string, filters: any) {
    return auditRepository.list(salonId, filters);
  }

  /**
   * Record an audit log entry. Called by other modules after important actions.
   * Never stores passwords or secrets — only metadata like entity IDs and action descriptions.
   */
  async log(input: {
    salonId: string; userId?: string; action: string;
    entityType?: string; entityId?: string; metadata?: any; ipAddress?: string;
  }) {
    return auditRepository.create(input);
  }
}

export const auditService = new AuditService();
