// ============================================================
// Staff — Controller (HTTP layer)
//
// Endpoints:
//   GET    /api/v1/staff                    — list all staff
//   POST   /api/v1/staff                    — create staff member
//   GET    /api/v1/staff/:id                 — get one (includes services, schedule, unavailability)
//   PATCH  /api/v1/staff/:id                 — update staff profile
//   DELETE /api/v1/staff/:id                 — remove staff member
//   PATCH  /api/v1/staff/:id/services         — replace service assignments
//   GET    /api/v1/staff/:id/services         — list service assignments
//   PATCH  /api/v1/staff/:id/schedule         — replace weekly schedule
//   GET    /api/v1/staff/:id/schedule         — get weekly schedule
//   POST   /api/v1/staff/:id/unavailability   — add temporary time-off
//   GET    /api/v1/staff/:id/unavailability   — list time-off entries
//   DELETE /api/v1/staff/:id/unavailability/:uid — remove a time-off entry
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { staffService } from '../service/staff.service.js';
import { ok, created } from '../../../utils/response.js';
import { requireSalonContext } from '../../../middleware/auth.js';
import { ValidationError } from '../../../middleware/errorHandler.js';
import {
  createStaffSchema, updateStaffSchema,
  updateStaffServicesSchema, updateStaffScheduleSchema, createUnavailabilitySchema,
} from '../validation/schemas.js';

export class StaffController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const items = await staffService.list(salonId);
      return ok(res, { items, total: items.length });
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const staff = await staffService.getById(salonId, req.params.id);
      return ok(res, staff);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = createStaffSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const staff = await staffService.create(salonId, parsed.data);
      return created(res, staff, 'Staff member added');
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = updateStaffSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const staff = await staffService.update(salonId, req.params.id, parsed.data);
      return ok(res, staff, 'Staff updated');
    } catch (err) { next(err); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      await staffService.remove(salonId, req.params.id);
      return ok(res, { id: req.params.id }, 'Staff removed');
    } catch (err) { next(err); }
  }

  // --- Service assignments ---

  async setServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = updateStaffServicesSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const services = await staffService.setServices(salonId, req.params.id, parsed.data.serviceIds);
      return ok(res, { items: services }, 'Service assignments updated');
    } catch (err) { next(err); }
  }

  async listServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const services = await staffService.listStaffServices(salonId, req.params.id);
      return ok(res, { items: services, total: services?.length || 0 });
    } catch (err) { next(err); }
  }

  // --- Schedule ---

  async setSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = updateStaffScheduleSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const schedule = await staffService.setSchedule(salonId, req.params.id, parsed.data.schedule);
      return ok(res, { items: schedule }, 'Schedule updated');
    } catch (err) { next(err); }
  }

  async getSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const schedule = await staffService.getSchedule(salonId, req.params.id);
      return ok(res, { items: schedule });
    } catch (err) { next(err); }
  }

  // --- Unavailability (temporary time-off) ---

  async addUnavailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = createUnavailabilitySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const entry = await staffService.addUnavailability(
        salonId, req.params.id, parsed.data.date, parsed.data.startTime, parsed.data.endTime, parsed.data.reason,
      );
      return created(res, entry, 'Unavailability added');
    } catch (err) { next(err); }
  }

  async listUnavailabilities(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const items = await staffService.listUnavailabilities(salonId, req.params.id);
      return ok(res, { items, total: items.length });
    } catch (err) { next(err); }
  }

  async removeUnavailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      await staffService.removeUnavailability(salonId, req.params.id, req.params.uid);
      return ok(res, { id: req.params.uid }, 'Unavailability removed');
    } catch (err) { next(err); }
  }
}

export const staffController = new StaffController();
