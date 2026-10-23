// ============================================================
// Analytics — Controller
//
// Endpoints:
//   GET /api/v1/analytics/dashboard  — dashboard summary (today's metrics + upcoming)
//   GET /api/v1/analytics            — full analytics (revenue, bookings, services, staff, customers, peak times)
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { analyticsService } from '../service/analytics.service.js';
import { ok } from '../../../utils/response.js';
import { requireSalonContext } from '../../../middleware/auth.js';
import { ValidationError } from '../../../middleware/errorHandler.js';
import { analyticsQuerySchema } from '../validation/schemas.js';

export class AnalyticsController {
  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      return ok(res, await analyticsService.getDashboardSummary(salonId));
    } catch (err) { next(err); }
  }

  async full(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = analyticsQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const result = await analyticsService.getFullAnalytics(
        salonId,
        parsed.data.range || '30D',
        { dateFrom: parsed.data.dateFrom, dateTo: parsed.data.dateTo },
      );
      return ok(res, result);
    } catch (err) { next(err); }
  }
}

export const analyticsController = new AnalyticsController();
