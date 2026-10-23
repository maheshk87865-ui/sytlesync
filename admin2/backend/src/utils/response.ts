// ============================================================
// Unified API response helpers
// - Success:  { success: true, data, message }
// - Error:    { success: false, error: { code, message, details } }
// ============================================================

import type { Response } from 'express';

export function ok<T>(res: Response, data: T, message?: string, status = 200): Response {
  return res.status(status).json({
    success: true,
    data,
    ...(message ? { message } : {}),
  });
}

export function created<T>(res: Response, data: T, message?: string): Response {
  return ok(res, data, message, 201);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}
