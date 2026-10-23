// ============================================================
// Payments — Controller
//
// Endpoints:
//   GET    /api/v1/payments           — list (with range, status, method, search filters)
//   GET    /api/v1/payments/summary   — revenue summary (today, week, month, lastMonth, allTime, custom)
//   GET    /api/v1/payments/:id        — detail (with booking + customer + service + staff)
//   POST   /api/v1/payments/:id/status — update status (PAID, PENDING, FAILED)
//   POST   /api/v1/payments/:id/refund — refund (full or partial)
//   PATCH  /api/v1/payments/:id/method — update payment method
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { paymentsService } from '../service/payments.service.js';
import { ok } from '../../../utils/response.js';
import { requireSalonContext } from '../../../middleware/auth.js';
import { ValidationError } from '../../../middleware/errorHandler.js';
import {
  paymentListFilterSchema, updatePaymentStatusSchema,
  refundPaymentSchema, updatePaymentMethodSchema, revenueSummarySchema,
} from '../validation/schemas.js';

export class PaymentsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = paymentListFilterSchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const items = await paymentsService.list(salonId, parsed.data);
      return ok(res, { items, total: items.length });
    } catch (err) { next(err); }
  }

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = revenueSummarySchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const summary = await paymentsService.getRevenueSummary(salonId, parsed.data.customStart, parsed.data.customEnd);
      return ok(res, summary);
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      return ok(res, await paymentsService.getById(salonId, req.params.id));
    } catch (err) { next(err); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = updatePaymentStatusSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      return ok(res, await paymentsService.updateStatus(salonId, req.params.id, parsed.data.status, parsed.data.transactionId, parsed.data.provider), 'Payment status updated');
    } catch (err) { next(err); }
  }

  async refund(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = refundPaymentSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      return ok(res, await paymentsService.refund(salonId, req.params.id, parsed.data.reason, parsed.data.amount), 'Payment refunded');
    } catch (err) { next(err); }
  }

  async updateMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = updatePaymentMethodSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      return ok(res, await paymentsService.updateMethod(salonId, req.params.id, parsed.data.method), 'Payment method updated');
    } catch (err) { next(err); }
  }
}

export const paymentsController = new PaymentsController();
