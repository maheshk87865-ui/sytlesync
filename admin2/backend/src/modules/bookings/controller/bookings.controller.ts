// ============================================================
// Bookings — Controller (HTTP layer)
//
// Endpoints:
//   GET    /api/v1/bookings                 — list with filters
//   POST   /api/v1/bookings                 — create (manual booking)
//   GET    /api/v1/bookings/:id              — detail
//   POST   /api/v1/bookings/:id/status       — update status (generic)
//   POST   /api/v1/bookings/:id/complete      — mark completed
//   POST   /api/v1/bookings/:id/cancel        — cancel (requires reason)
//   POST   /api/v1/bookings/:id/reschedule    — reschedule (re-checks availability)
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { bookingsService } from '../service/bookings.service.js';
import { ok, created } from '../../../utils/response.js';
import { requireSalonContext } from '../../../middleware/auth.js';
import { ValidationError } from '../../../middleware/errorHandler.js';
import {
  createBookingSchema, updateBookingStatusSchema, cancelBookingSchema,
  rescheduleBookingSchema, bookingListFilterSchema,
} from '../validation/schemas.js';

export class BookingsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = bookingListFilterSchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const items = await bookingsService.list(salonId, parsed.data as any);
      return ok(res, { items, total: items.length });
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const booking = await bookingsService.getById(salonId, req.params.id);
      return ok(res, booking);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = createBookingSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const booking = await bookingsService.create(salonId, parsed.data);
      return created(res, booking, 'Booking created');
    } catch (err) { next(err); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = updateBookingStatusSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const booking = await bookingsService.updateStatus(salonId, req.params.id, parsed.data.status, parsed.data.reason);
      return ok(res, booking, 'Booking status updated');
    } catch (err) { next(err); }
  }

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const booking = await bookingsService.complete(salonId, req.params.id);
      return ok(res, booking, 'Booking completed');
    } catch (err) { next(err); }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = cancelBookingSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const booking = await bookingsService.cancel(salonId, req.params.id, parsed.data.reason);
      return ok(res, booking, 'Booking cancelled');
    } catch (err) { next(err); }
  }

  async reschedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = rescheduleBookingSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const booking = await bookingsService.reschedule(salonId, req.params.id, parsed.data.date, parsed.data.startTime);
      return ok(res, booking, 'Booking rescheduled');
    } catch (err) { next(err); }
  }
}

export const bookingsController = new BookingsController();
