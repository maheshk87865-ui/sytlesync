// ============================================================
// Request ID middleware
// - Adds a unique requestId to every request
// - Echoes it back in the `X-Request-Id` response header so clients can correlate
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'] as string | undefined;
  const id = incoming || uuidv4();
  (req as unknown as { requestId: string }).requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
