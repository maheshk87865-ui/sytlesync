// ============================================================
// Audit — Controller
//
// Endpoints:
//   GET /api/v1/audit — list audit logs (Owner only, with filters)
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { auditService } from '../service/audit.service.js';
import { ok } from '../../../utils/response.js';
import { requireSalonContext } from '../../../middleware/auth.js';

export class AuditController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const filters = {
        action: req.query.action as string | undefined,
        entityType: req.query.entityType as string | undefined,
        entityId: req.query.entityId as string | undefined,
        userId: req.query.userId as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      };
      const items = await auditService.list(salonId, filters);
      return ok(res, { items, total: items.length });
    } catch (err) { next(err); }
  }
}

export const auditController = new AuditController();
