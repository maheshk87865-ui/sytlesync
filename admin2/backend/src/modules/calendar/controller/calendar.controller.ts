// ============================================================
// Calendar — Controller
//
// GET /api/v1/calendar?view=MONTH|WEEK|DAY&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&staffId=xxx
//
// Returns normalized calendar events (BOOKED, AVAILABLE, BLOCKED,
// BREAK, UNAVAILABLE, CLOSED) for the requested date range.
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { calendarService } from '../service/calendar.service.js';
import { ok } from '../../../utils/response.js';
import { requireSalonContext } from '../../../middleware/auth.js';
import { ValidationError } from '../../../middleware/errorHandler.js';
import { calendarQuerySchema } from '../validation/schemas.js';

export class CalendarController {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = calendarQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const result = await calendarService.getCalendar(salonId, parsed.data);
      return ok(res, result);
    } catch (err) { next(err); }
  }
}

export const calendarController = new CalendarController();
