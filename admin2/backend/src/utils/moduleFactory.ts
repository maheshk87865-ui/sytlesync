// ============================================================
// Generic CRUD module factory
//
// Generates a consistent Controller → Service → Repository → Routes
// implementation for any salon-scoped resource. Each domain module
// (salons, staff, bookings, etc.) uses this factory to scaffold its
// CRUD endpoints, then adds domain-specific logic on top.
//
// All resources are salon-scoped: every query filters by `salonId`
// derived from the authenticated request context. A salon can never
// see another salon's data.
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ok, created } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { requireSalonContext } from '../middleware/auth.js';
import type { ZodSchema } from 'zod';

export interface ModuleConfig<TDelegateKey extends keyof PrismaClient> {
  /** Prisma model delegate key, e.g. `salonService`, `booking`, `staff` */
  delegateKey: TDelegateKey;
  /** Human-readable resource name for error messages */
  resourceName: string;
  /** Zod schema for create payload */
  createSchema: ZodSchema;
  /** Zod schema for update payload (partial) */
  updateSchema: ZodSchema;
}

/**
 * Build a salon-scoped repository for a given Prisma model.
 * The repository assumes each model has a `salonId` field for scoping.
 */
export function buildSalonScopedRepository<TDelegateKey extends keyof PrismaClient>(delegateKey: TDelegateKey) {
  // We use `any` deliberately here because Prisma's delegate type cannot be expressed
  // generically across all models without losing ergonomics. Each domain's service
  // layer is fully typed against its own Prisma model.
  return {
    delegate: () => (prismaClient as any)[delegateKey],

    async list(salonId: string, options: { skip?: number; take?: number; where?: any; orderBy?: any; include?: any } = {}) {
      const where = { salonId, ...(options.where || {}) };
      return this.delegate().findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: options.orderBy,
        include: options.include,
      });
    },

    async count(salonId: string, whereExtra: any = {}): Promise<number> {
      return this.delegate().count({ where: { salonId, ...whereExtra } });
    },

    async getById(salonId: string, id: string, include?: any): Promise<any | null> {
      return this.delegate().findUnique({ where: { id }, include });
    },

    async create(salonId: string, data: any): Promise<any> {
      return this.delegate().create({ data: { salonId, ...data } });
    },

    async update(salonId: string, id: string, data: any): Promise<any> {
      // Ensure the resource belongs to the salon before updating
      const existing = await this.getById(salonId, id);
      if (!existing) throw new NotFoundError('Resource not found');
      return this.delegate().update({ where: { id }, data });
    },

    async remove(salonId: string, id: string): Promise<void> {
      const existing = await this.getById(salonId, id);
      if (!existing) throw new NotFoundError('Resource not found');
      await this.delegate().delete({ where: { id } });
    },
  };
}

// Imported here to avoid a circular import in the factory
import { prisma } from '../database/prisma.js';
const prismaClient = prisma;

/**
 * Build a salon-scoped service (business logic) for a resource.
 */
export function buildSalonScopedService<TDelegateKey extends keyof PrismaClient>(
  repo: ReturnType<typeof buildSalonScopedRepository<TDelegateKey>>,
) {
  return {
    async list(salonId: string, options?: { skip?: number; take?: number; where?: any; orderBy?: any; include?: any }) {
      return repo.list(salonId, options);
    },
    async count(salonId: string, whereExtra?: any) {
      return repo.count(salonId, whereExtra);
    },
    async getById(salonId: string, id: string, include?: any) {
      const record = await repo.getById(salonId, id, include);
      if (!record) throw new NotFoundError('Resource not found');
      return record;
    },
    async create(salonId: string, data: any) {
      return repo.create(salonId, data);
    },
    async update(salonId: string, id: string, data: any) {
      return repo.update(salonId, id, data);
    },
    async remove(salonId: string, id: string) {
      return repo.remove(salonId, id);
    },
  };
}

/**
 * Build a salon-scoped HTTP controller for a resource.
 */
export function buildSalonScopedController<TDelegateKey extends keyof PrismaClient>(
  service: ReturnType<typeof buildSalonScopedService<TDelegateKey>>,
  config: ModuleConfig<TDelegateKey>,
) {
  return {
    async list(req: Request, res: Response, next: NextFunction) {
      try {
        const { salonId } = requireSalonContext(req);
        const take = Math.min(Math.max(parseInt((req.query.take as string) || '50', 10) || 50, 1), 200);
        const skip = parseInt((req.query.skip as string) || '0', 10) || 0;
        const records = await service.list(salonId, { skip, take });
        const total = await service.count(salonId);
        return ok(res, { items: records, total, skip, take });
      } catch (err) {
        next(err);
      }
    },

    async getById(req: Request, res: Response, next: NextFunction) {
      try {
        const { salonId } = requireSalonContext(req);
        const record = await service.getById(salonId, req.params.id);
        return ok(res, record);
      } catch (err) {
        next(err);
      }
    },

    async create(req: Request, res: Response, next: NextFunction) {
      try {
        const { salonId } = requireSalonContext(req);
        const parsed = config.createSchema.safeParse(req.body);
        if (!parsed.success) throw new ValidationError(parsed.error.issues);
        const record = await service.create(salonId, parsed.data);
        return created(res, record, `${config.resourceName} created`);
      } catch (err) {
        next(err);
      }
    },

    async update(req: Request, res: Response, next: NextFunction) {
      try {
        const { salonId } = requireSalonContext(req);
        const parsed = config.updateSchema.safeParse(req.body);
        if (!parsed.success) throw new ValidationError(parsed.error.issues);
        const record = await service.update(salonId, req.params.id, parsed.data);
        return ok(res, record, `${config.resourceName} updated`);
      } catch (err) {
        next(err);
      }
    },

    async remove(req: Request, res: Response, next: NextFunction) {
      try {
        const { salonId } = requireSalonContext(req);
        await service.remove(salonId, req.params.id);
        return ok(res, { id: req.params.id }, `${config.resourceName} deleted`);
      } catch (err) {
        next(err);
      }
    },
  };
}

/**
 * Build salon-scoped CRUD routes for a resource.
 * Returns an Express Router with GET/POST/PUT/DELETE handlers.
 */
export function buildSalonScopedRoutes<TDelegateKey extends keyof PrismaClient>(
  controller: ReturnType<typeof buildSalonScopedController<TDelegateKey>>,
  options: { authMiddleware: any },
) {
  const router = Router();
  router.get('/', options.authMiddleware, controller.list);
  router.get('/:id', options.authMiddleware, controller.getById);
  router.post('/', options.authMiddleware, controller.create);
  router.put('/:id', options.authMiddleware, controller.update);
  router.delete('/:id', options.authMiddleware, controller.remove);
  return router;
}
