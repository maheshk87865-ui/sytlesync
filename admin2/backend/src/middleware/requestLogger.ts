// ============================================================
// Request logging middleware (uses morgan + structured fields)
// - Logs: requestId, method, path, status, response time, salon/user id (if attached)
// - Never logs request bodies (which may contain passwords or payment secrets)
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { createRequestLogger } from '../config/logger.js';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  const requestId = (req as unknown as { requestId?: string }).requestId || '-';
  const reqLog = createRequestLogger(requestId);

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1_000_000;
    const context = (req as unknown as { context?: Record<string, unknown> }).context || {};
    reqLog.info(`${req.method} ${req.originalUrl}`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      ...context,
    });
  });

  next();
}
