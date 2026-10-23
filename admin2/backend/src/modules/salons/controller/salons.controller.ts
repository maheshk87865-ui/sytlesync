// ============================================================
// Salons — Controller (HTTP layer)
// Endpoints:
//   GET   /api/v1/salon              — get salon profile
//   PATCH /api/v1/salon               — update salon profile
//   PATCH /api/v1/salon/status         — set OPEN/CLOSED
//   PATCH /api/v1/salon/business-hours — set weekly business hours
//   POST  /api/v1/salon/closure       — set temporary closure window
//   DELETE /api/v1/salon/closure      — clear temporary closure
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { salonsService } from '../service/salons.service.js';
import { ok } from '../../../utils/response.js';
import { requireSalonContext } from '../../../middleware/auth.js';
import { ValidationError } from '../../../middleware/errorHandler.js';
import {
  updateSalonSchema, updateStatusSchema, setClosureSchema,
  businessHoursSchema,
} from '../validation/schemas.js';

export class SalonsController {
  // GET /api/v1/salon — full profile (includes businessHours)
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const salon = await salonsService.getSalon(salonId);
      return ok(res, salon);
    } catch (err) { next(err); }
  }

  // PATCH /api/v1/salon — update profile fields (name, description, address, etc.)
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = updateSalonSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const salon = await salonsService.updateSalon(salonId, parsed.data);
      return ok(res, salon, 'Salon updated');
    } catch (err) { next(err); }
  }

  // PATCH /api/v1/salon/status — set OPEN or CLOSED
  async setStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const salon = await salonsService.setStatus(salonId, parsed.data.status);
      return ok(res, salon, `Salon is now ${parsed.data.status}`);
    } catch (err) { next(err); }
  }

  // PATCH /api/v1/salon/business-hours — set weekly business hours
  async setBusinessHours(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = businessHoursSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const businessHours = await salonsService.setBusinessHours(salonId, parsed.data);
      return ok(res, { businessHours }, 'Business hours updated');
    } catch (err) { next(err); }
  }

  // GET /api/v1/salon/business-hours — get business hours
  async getBusinessHours(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const businessHours = await salonsService.getBusinessHours(salonId);
      return ok(res, { businessHours });
    } catch (err) { next(err); }
  }

  // POST /api/v1/salon/closure — set temporary closure window
  async setClosure(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = setClosureSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const salon = await salonsService.setTemporaryClosure(
        salonId,
        new Date(parsed.data.start),
        new Date(parsed.data.end),
        parsed.data.reason,
      );
      return ok(res, salon, 'Temporary closure set');
    } catch (err) { next(err); }
  }

  // DELETE /api/v1/salon/closure — clear temporary closure
  async clearClosure(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const salon = await salonsService.clearTemporaryClosure(salonId);
      return ok(res, salon, 'Temporary closure cleared');
    } catch (err) { next(err); }
  }
}

export const salonsController = new SalonsController();
