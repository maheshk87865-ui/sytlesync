// ============================================================
// Audit logging middleware — attach to routes to auto-record audit entries
//
// Usage:
//   router.post('/', auditLog('service.created', 'service'), serviceController.create);
//   router.delete('/:id', auditLog('service.deleted', 'service', 'id'), serviceController.remove);
//
// The middleware reads req.context (userId, salonId) and extracts the entity
// ID from req.params[entityIdParam] or req.body.id after the handler runs.
//
// Never stores passwords or secrets — only the action, entity type/ID, and
// non-sensitive metadata.
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { auditService } from '../modules/audit/service/audit.service.js';
import { logger } from '../config/logger.js';

export function auditLog(action: string, entityType?: string, entityIdParam?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Let the handler run first, then log if it succeeded
    const originalSend = res.send.bind(res);

    res.send = function (body: any) {
      const statusCode = res.statusCode;

      // Only log on success (2xx)
      if (statusCode >= 200 && statusCode < 300 && req.context) {
        const entityId = entityIdParam ? (req.params[entityIdParam] || (body && body.data && body.data.id)) : undefined;
        const metadata: any = {};
        // For create/update, capture key fields from the request body (excluding sensitive data)
        if (req.body && typeof req.body === 'object') {
          if (req.body.name) metadata.entityName = req.body.name;
          if (req.body.price !== undefined) metadata.pricePaise = req.body.price;
          if (req.body.status) metadata.newStatus = req.body.status;
          if (req.body.reason) metadata.reason = req.body.reason;
        }

        auditService.log({
          salonId: req.context.salonId,
          userId: req.context.userId,
          action,
          entityType,
          entityId,
          metadata,
          ipAddress: req.ip || req.socket.remoteAddress,
        }).catch((err) => {
          // Never fail the request because the audit log failed
          logger.error('Audit log failed', { action, error: err instanceof Error ? err.message : String(err) });
        });
      }

      return originalSend(body);
    };

    next();
  };
}
