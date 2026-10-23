// ============================================================
// Idempotency middleware
//
// Uses the `X-Idempotency-Key` header to prevent duplicate processing.
// If the same key is sent twice for the same salon+user, the original
// response is returned (or 409 if the first request is still processing).
//
// This is critical for payment operations — a payment gateway may retry
// webhook deliveries, and the salon app may accidentally double-submit.
//
// Implementation: in-memory cache (sufficient for single-instance).
// For multi-instance, replace with Redis.
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler.js';

interface IdempotencyEntry {
  status: 'processing' | 'completed';
  response?: any;
  statusCode?: number;
  timestamp: number;
}

const cache = new Map<string, IdempotencyEntry>();
const TTL = 24 * 60 * 60 * 1000; // 24 hours

export function idempotency() {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['x-idempotency-key'] as string | undefined;
    if (!key) {
      // No idempotency key → normal request (no dedup)
      next();
      return;
    }

    const cacheKey = `${req.context?.salonId}:${req.context?.userId}:${key}`;
    const existing = cache.get(cacheKey);

    if (existing) {
      if (existing.status === 'processing') {
        // Another request with the same key is in-flight → 409
        next(new AppError('CONFLICT', 'A request with this idempotency key is already being processed'));
        return;
      }
      if (existing.status === 'completed') {
        // Return the cached response
        res.status(existing.statusCode || 200).json(existing.response);
        return;
      }
    }

    // Mark as processing
    cache.set(cacheKey, { status: 'processing', timestamp: Date.now() });

    // Intercept the response to cache it
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      cache.set(cacheKey, {
        status: 'completed',
        response: body,
        statusCode: res.statusCode,
        timestamp: Date.now(),
      });
      return originalJson(body);
    };

    next();
  };
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > TTL) cache.delete(key);
  }
}, 60 * 60 * 1000).unref();
