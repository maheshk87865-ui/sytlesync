/**
 * Request validation middleware (Zod-based).
 * ------------------------------------------------------------
 * Usage:
 *   router.post("/login", validateBody(loginSchema), controller.login);
 *   router.get("/salons", validateQuery(salonsQuerySchema), controller.list);
 *
 * On validation failure, throws a ZodError which the global error
 * handler converts to a BackendError(validation) with status 400.
 */

import type { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Throw — the global error handler will format it.
      throw result.error;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      throw result.error;
    }
    req.query = result.data;
    next();
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      throw result.error;
    }
    req.params = result.data;
    next();
  };
}
