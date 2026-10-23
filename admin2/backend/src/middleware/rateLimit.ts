// ============================================================
// Rate limiting middleware
//
// Configurable per-endpoint rate limits. Uses an in-memory sliding
// window counter (sufficient for a single-instance backend).
// For multi-instance deployments, replace with Redis-backed limits.
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler.js';
import { config } from '../config/index.js';

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

/**
 * Create a rate limiter middleware.
 * @param windowMs  Time window in milliseconds
 * @param max        Max requests per window per IP or user
 * @param keyFn      Function to extract the rate-limit key (default: IP)
 */
export function rateLimit(windowMs: number = config.rateLimit.windowMs, max: number = config.rateLimit.max, keyFn?: (req: Request) => string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = keyFn ? keyFn(req) : (req.ip || req.socket.remoteAddress || 'unknown');
    const now = Date.now();
    const bucketKey = `${key}`;

    const bucket = buckets.get(bucketKey);
    if (!bucket || bucket.resetAt < now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count++;
    if (bucket.count > max) {
      _res.setHeader('X-RateLimit-Limit', String(max));
      _res.setHeader('X-RateLimit-Remaining', '0');
      _res.setHeader('X-RateLimit-Reset', String(Math.floor(bucket.resetAt / 1000)));
      next(new AppError('RATE_LIMITED', 'Too many requests. Please try again later.'));
      return;
    }

    _res.setHeader('X-RateLimit-Limit', String(max));
    _res.setHeader('X-RateLimit-Remaining', String(max - bucket.count));
    next();
  };
}

// Presets
export const loginRateLimit = () => rateLimit(15 * 60 * 1000, 10); // 10 per 15 min per IP
export const passwordResetRateLimit = () => rateLimit(60 * 60 * 1000, 5); // 5 per hour per IP
export const bookingRateLimit = () => rateLimit(60 * 1000, 30); // 30 per minute per user
export const paymentRateLimit = () => rateLimit(60 * 1000, 20); // 20 per minute per user
export const searchRateLimit = () => rateLimit(60 * 1000, 60); // 60 per minute per user
export const supportRateLimit = () => rateLimit(60 * 60 * 1000, 20); // 20 per hour per user
export const defaultRateLimit = () => rateLimit(config.rateLimit.windowMs, config.rateLimit.max);

// Clean up expired buckets periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref();
