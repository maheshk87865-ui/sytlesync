// ============================================================
// Zod validation middleware factory
// - Validates req.body / req.query / req.params against a Zod schema
// - On failure: throws ValidationError → handled by errorHandler with 422
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from './errorHandler.js';

type RequestPart = 'body' | 'query' | 'params';

export function validateRequest(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const target = req[part];
    const result = schema.safeParse(target);
    if (!result.success) {
      next(new ValidationError(result.error.issues));
      return;
    }
    // Replace with the parsed + coerced value
    (req as unknown as Record<string, unknown>)[part] = result.data;
    next();
  };
}
