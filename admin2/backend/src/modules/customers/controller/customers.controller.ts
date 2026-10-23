// ============================================================
// Customers — Controller
//
// Endpoints:
//   GET    /api/v1/customers           — list (with search, date, service, staff, status filters)
//   POST   /api/v1/customers           — create (Owner + Manager)
//   GET    /api/v1/customers/insights   — customer insights (calculated from actual data)
//   GET    /api/v1/customers/:id        — detail (profile + booking history + reviews + favorites + next appt)
//   GET    /api/v1/customers/:id/history — booking history (formatted)
//   PATCH  /api/v1/customers/:id        — update (Owner + Manager)
//   DELETE /api/v1/customers/:id        — remove (Owner + Manager)
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { customersService } from '../service/customers.service.js';
import { ok, created } from '../../../utils/response.js';
import { requireSalonContext } from '../../../middleware/auth.js';
import { ValidationError } from '../../../middleware/errorHandler.js';
import { createCustomerSchema, updateCustomerSchema, customerListFilterSchema } from '../validation/schemas.js';

export class CustomersController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = customerListFilterSchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const items = await customersService.list(salonId, parsed.data);
      return ok(res, { items, total: items.length });
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const customer = await customersService.getById(salonId, req.params.id);
      return ok(res, customer);
    } catch (err) { next(err); }
  }

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const history = await customersService.getHistory(salonId, req.params.id);
      return ok(res, { items: history, total: history.length });
    } catch (err) { next(err); }
  }

  async getInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const insights = await customersService.getInsights(salonId);
      return ok(res, insights);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = createCustomerSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const c = await customersService.create(salonId, parsed.data);
      return created(res, c, 'Customer added');
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = updateCustomerSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const c = await customersService.update(salonId, req.params.id, parsed.data);
      return ok(res, c, 'Customer updated');
    } catch (err) { next(err); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      await customersService.remove(salonId, req.params.id);
      return ok(res, { id: req.params.id }, 'Customer removed');
    } catch (err) { next(err); }
  }
}

export const customersController = new CustomersController();
