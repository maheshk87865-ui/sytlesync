// ============================================================
// Availability — Controller (HTTP layer)
//
// Endpoints:
//   GET    /api/v1/availability          — get calculated slots (date, staffId, serviceId)
//   GET    /api/v1/availability/blocks    — list blocked slots + breaks
//   POST   /api/v1/availability/blocks    — create a blocked slot
//   POST   /api/v1/availability/breaks   — create a break
//   DELETE /api/v1/availability/blocks/:id — remove a blocked slot / break
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { availabilityService } from '../service/availability.service.js';
import { ok, created } from '../../../utils/response.js';
import { requireSalonContext } from '../../../middleware/auth.js';
import { ValidationError } from '../../../middleware/errorHandler.js';
import { availabilityQuerySchema, createBlockSchema, createBreakSchema } from '../validation/schemas.js';

export class AvailabilityController {
  /**
   * GET /api/v1/availability?date=2026-10-06&staffId=xxx&serviceId=yyy
   * Returns calculated slots: AVAILABLE, BOOKED, BLOCKED, BREAK, UNAVAILABLE
   */
  async getSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = availabilityQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const result = await availabilityService.getSlots(
        salonId,
        parsed.data.date,
        parsed.data.staffId,
        parsed.data.serviceId,
      );
      return ok(res, result);
    } catch (err) { next(err); }
  }

  /**
   * GET /api/v1/availability/blocks?date=2026-10-06
   * Lists all blocked slots + breaks for the salon (optionally filtered by date)
   */
  async listBlocks(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const items = await availabilityService.listBlocks(salonId, req.query.date as string | undefined);
      return ok(res, { items, total: items.length });
    } catch (err) { next(err); }
  }

  /**
   * POST /api/v1/availability/blocks
   * Creates a blocked slot (salon-wide or staff-specific)
   */
  async createBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId, userId } = requireSalonContext(req);
      const parsed = createBlockSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);

      // Use reasonText if reason enum doesn't match, otherwise use the enum
      const reason = parsed.data.reasonText || parsed.data.reason;

      const block = await availabilityService.createBlock(salonId, userId, {
        date: parsed.data.date,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        reason,
        type: parsed.data.type,
        staffId: parsed.data.staffId,
      });
      return created(res, block, parsed.data.type === 'BREAK' ? 'Break added' : 'Slot blocked');
    } catch (err) { next(err); }
  }

  /**
   * POST /api/v1/availability/breaks
   * Creates a break (convenience endpoint — same as blocks with type=BREAK)
   */
  async createBreak(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId, userId } = requireSalonContext(req);
      const parsed = createBreakSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);

      const block = await availabilityService.createBlock(salonId, userId, {
        date: parsed.data.date,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        reason: parsed.data.reason,
        type: 'BREAK',
        staffId: parsed.data.staffId,
      });
      return created(res, block, 'Break added');
    } catch (err) { next(err); }
  }

  /**
   * DELETE /api/v1/availability/blocks/:id
   * Removes a blocked slot or break
   */
  async removeBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      await availabilityService.removeBlock(salonId, req.params.id);
      return ok(res, { id: req.params.id }, 'Slot unblocked');
    } catch (err) { next(err); }
  }
}

export const availabilityController = new AvailabilityController();
