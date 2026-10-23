// ============================================================
// Application error types & centralized error handler
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  // domain-specific codes
  | 'BOOKING_CONFLICT'
  | 'SLOT_BLOCKED'
  | 'SLOT_BREAK'
  | 'SALON_CLOSED'
  | 'STAFF_UNAVAILABLE'
  | 'INVALID_STATUS_TRANSITION'
  | 'PAYMENT_NOT_REFUNDABLE';

const HTTP_BY_CODE: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  BOOKING_CONFLICT: 409,
  SLOT_BLOCKED: 409,
  SLOT_BREAK: 409,
  SALON_CLOSED: 409,
  STAFF_UNAVAILABLE: 409,
  INVALID_STATUS_TRANSITION: 409,
  PAYMENT_NOT_REFUNDABLE: 409,
};

export class AppError extends Error {
  code: ErrorCode;
  httpStatus: number;
  details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.httpStatus = HTTP_BY_CODE[code];
    this.details = details;
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super('NOT_FOUND', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown, message = 'Validation failed') {
    super('VALIDATION_ERROR', message, details);
  }
}

// Convert any thrown value into an AppError-like envelope
function toErrorEnvelope(err: unknown, requestId?: string) {
  if (err instanceof AppError) {
    return {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
      ...(requestId ? { requestId } : {}),
    };
  }
  if (err instanceof ZodError) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR' as ErrorCode,
        message: 'Validation failed',
        details: err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      ...(requestId ? { requestId } : {}),
    };
  }
  // Unknown — never leak raw stack/DB internals
  const message = err instanceof Error ? err.message : 'Internal server error';
  logger.error('Unhandled error', {
    requestId,
    errorName: err instanceof Error ? err.name : typeof err,
    message,
  });
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR' as ErrorCode,
      message: config_safe_message(message),
    },
    ...(requestId ? { requestId } : {}),
  };
}

// In production, never expose raw error details to the client
function config_safe_message(rawMessage: string): string {
  if (process.env.NODE_ENV === 'production') {
    return 'Internal server error';
  }
  return rawMessage;
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || (req as unknown as { requestId?: string }).requestId;
  const envelope = toErrorEnvelope(err, requestId);
  const status = err instanceof AppError ? err.httpStatus : err instanceof ZodError ? 422 : 500;
  res.status(status).json(envelope);
}

// 404 handler for unmatched routes
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.path}`,
    },
  });
}
