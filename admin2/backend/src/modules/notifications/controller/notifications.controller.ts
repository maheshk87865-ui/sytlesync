// ============================================================
// Notifications — Controller
//
// Endpoints:
//   GET   /api/v1/notifications           — list (user-scoped, with optional type/unreadOnly filter)
//   PATCH /api/v1/notifications/:id/read  — mark one as read
//   POST  /api/v1/notifications/read-all   — mark all as read
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { notificationsService } from '../service/notifications.service.js';
import { ok } from '../../../utils/response.js';
import { requireSalonContext } from '../../../middleware/auth.js';
import { ValidationError } from '../../../middleware/errorHandler.js';
import { notificationListFilterSchema } from '../validation/schemas.js';

export class NotificationsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId, userId } = requireSalonContext(req);
      const parsed = notificationListFilterSchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const result = await notificationsService.list(salonId, userId, parsed.data);
      return ok(res, result);
    } catch (err) { next(err); }
  }

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId, userId } = requireSalonContext(req);
      const n = await notificationsService.markRead(salonId, userId, req.params.id);
      return ok(res, n, 'Marked as read');
    } catch (err) { next(err); }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId, userId } = requireSalonContext(req);
      const result = await notificationsService.markAllRead(salonId, userId);
      return ok(res, result, 'All notifications marked as read');
    } catch (err) { next(err); }
  }
}

export const notificationsController = new NotificationsController();
