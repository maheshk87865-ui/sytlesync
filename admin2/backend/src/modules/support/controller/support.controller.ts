// ============================================================
// Support — Controller
//
// Endpoints:
//   GET    /api/v1/support           — list tickets
//   POST   /api/v1/support           — create ticket
//   GET    /api/v1/support/:id        — ticket detail (with responses)
//   POST   /api/v1/support/:id/respond — add a response
//   PATCH  /api/v1/support/:id/status — update ticket status
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { supportService } from '../service/support.service.js';
import { ok, created } from '../../../utils/response.js';
import { requireSalonContext } from '../../../middleware/auth.js';
import { ValidationError } from '../../../middleware/errorHandler.js';
import { createTicketSchema, respondTicketSchema, updateTicketStatusSchema } from '../validation/schemas.js';

export class SupportController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const items = await supportService.list(salonId);
      return ok(res, { items, total: items.length });
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      return ok(res, await supportService.getById(salonId, req.params.id));
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId, userId } = requireSalonContext(req);
      const parsed = createTicketSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      return created(res, await supportService.create(salonId, userId, parsed.data), 'Ticket created');
    } catch (err) { next(err); }
  }

  async respond(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = respondTicketSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      return ok(res, await supportService.respond(salonId, req.params.id, parsed.data.message), 'Reply sent');
    } catch (err) { next(err); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = updateTicketStatusSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      return ok(res, await supportService.updateStatus(salonId, req.params.id, parsed.data.status), 'Ticket status updated');
    } catch (err) { next(err); }
  }
}

export const supportController = new SupportController();
