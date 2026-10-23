// ============================================================
// Reviews — Controller
//
// Endpoints:
//   GET    /api/v1/reviews           — list (with rating, service, staff, date filters)
//   POST   /api/v1/reviews           — create (Owner + Manager)
//   GET    /api/v1/reviews/analytics  — rating distribution + average (calculated from actual data)
//   GET    /api/v1/reviews/:id        — detail (cross-salon guard)
//   POST   /api/v1/reviews/:id/reply  — reply (Owner + Manager, stores repliedBy + repliedAt)
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { reviewsService } from '../service/reviews.service.js';
import { ok, created } from '../../../utils/response.js';
import { requireSalonContext } from '../../../middleware/auth.js';
import { ValidationError } from '../../../middleware/errorHandler.js';
import { createReviewSchema, replyReviewSchema, reviewListFilterSchema } from '../validation/schemas.js';

export class ReviewsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = reviewListFilterSchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const items = await reviewsService.list(salonId, parsed.data);
      return ok(res, { items, total: items.length });
    } catch (err) { next(err); }
  }

  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const analytics = await reviewsService.getRatingAnalytics(salonId);
      return ok(res, analytics);
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      return ok(res, await reviewsService.getById(salonId, req.params.id));
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = createReviewSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      return created(res, await reviewsService.create(salonId, parsed.data), 'Review added');
    } catch (err) { next(err); }
  }

  async reply(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId, userId } = requireSalonContext(req);
      const parsed = replyReviewSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      return ok(res, await reviewsService.reply(salonId, req.params.id, parsed.data.reply, userId), 'Reply posted');
    } catch (err) { next(err); }
  }
}

export const reviewsController = new ReviewsController();
