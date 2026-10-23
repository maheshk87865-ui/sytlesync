// ============================================================
// Services (catalog) — Controller (HTTP layer)
//
// Endpoints:
//   GET    /api/v1/services                 — list (active only by default; ?includeInactive=true for all)
//   POST   /api/v1/services                 — create (Owner + Manager)
//   GET    /api/v1/services/:id              — get one
//   PATCH  /api/v1/services/:id              — update (Owner + Manager)
//   POST   /api/v1/services/:id/deactivate   — soft-delete (Owner + Manager)
//   POST   /api/v1/services/:id/reactivate   — restore (Owner + Manager)
//   POST   /api/v1/services/:id/toggle-active — convenience toggle
//   DELETE /api/v1/services/:id              — safe delete (auto-deactivates if bookings exist)
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { servicesService } from '../service/services.service.js';
import { ok, created } from '../../../utils/response.js';
import { requireSalonContext } from '../../../middleware/auth.js';
import { ValidationError } from '../../../middleware/errorHandler.js';
import { createServiceSchema, updateServiceSchema } from '../validation/schemas.js';

export class ServicesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const includeInactive = req.query.includeInactive === 'true';
      const items = await servicesService.list(salonId, includeInactive);
      return ok(res, { items, total: items.length });
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const service = await servicesService.getById(salonId, req.params.id);
      return ok(res, service);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = createServiceSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const service = await servicesService.create(salonId, parsed.data);
      return created(res, service, 'Service added');
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = updateServiceSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const service = await servicesService.update(salonId, req.params.id, parsed.data);
      return ok(res, service, 'Service updated');
    } catch (err) { next(err); }
  }

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const service = await servicesService.deactivate(salonId, req.params.id);
      return ok(res, service, 'Service deactivated — invisible to customers, historical bookings preserved');
    } catch (err) { next(err); }
  }

  async reactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const service = await servicesService.reactivate(salonId, req.params.id);
      return ok(res, service, 'Service reactivated — now visible to customers');
    } catch (err) { next(err); }
  }

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const service = await servicesService.toggleActive(salonId, req.params.id);
      return ok(res, service, `Service ${service.active ? 'activated' : 'deactivated'}`);
    } catch (err) { next(err); }
  }

  /**
   * Safe delete: if the service has historical bookings, auto-deactivates
   * and returns a message explaining why it wasn't hard-deleted.
   * If no bookings exist, hard-deletes.
   */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const result = await servicesService.remove(salonId, req.params.id);
      const status = result.deleted ? 200 : 200; // 200 in both cases (deactivated is not an error)
      return ok(res, result, result.message, status);
    } catch (err) { next(err); }
  }
}

export const servicesController = new ServicesController();
