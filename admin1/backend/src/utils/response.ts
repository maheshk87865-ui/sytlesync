/**
 * Consistent API response format.
 * ------------------------------------------------------------
 *   Success: { success: true, data: T, message?: string }
 *   Error:   { success: false, error: { code, message, details? } }
 *
 * All controllers use these helpers so the response shape is
 * identical across every endpoint.
 */

import type { Response } from "express";
import { BackendError, type BackendErrorKind } from "./errors";

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: BackendErrorKind | string;
    message: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode: number = 200): Response {
  const body: SuccessResponse<T> = { success: true, data, ...(message ? { message } : {}) };
  return res.status(statusCode).json(body);
}

export function sendError(res: Response, error: BackendError | Error, message?: string, code?: string): Response {
  if (error instanceof BackendError) {
    const body: ErrorResponse = {
      success: false,
      error: {
        code: error.kind,
        message: message || error.userMessage,
        ...(error.detail !== undefined ? { details: typeof error.detail === "string" ? error.detail : "[redacted]" } : {}),
      },
    };
    return res.status(error.httpStatus).json(body);
  }
  // Unknown error — return generic 500 to avoid leaking internals.
  const body: ErrorResponse = {
    success: false,
    error: {
      code: code || "internal",
      message: message || "An unexpected error occurred. Please try again.",
    },
  };
  return res.status(500).json(body);
}

export function sendNotFound(res: Response, message: string): Response {
  return sendError(res, new BackendError({ kind: "not_found", userMessage: message }));
}

export function sendUnauthorized(res: Response, message: string = "Please sign in to continue."): Response {
  return sendError(res, new BackendError({ kind: "auth", userMessage: message }));
}

export function sendForbidden(res: Response, message: string = "You do not have permission to perform this action."): Response {
  return sendError(res, new BackendError({ kind: "permission", userMessage: message }));
}

export function sendValidation(res: Response, message: string, details?: unknown): Response {
  return sendError(res, new BackendError({ kind: "validation", userMessage: message, detail: details }));
}

export function sendConflict(res: Response, message: string): Response {
  return sendError(res, new BackendError({ kind: "conflict", userMessage: message }));
}

export function sendRateLimited(res: Response, message: string = "Too many requests. Please slow down."): Response {
  return sendError(res, new BackendError({ kind: "rate_limit", userMessage: message }));
}

export function sendServerError(res: Response, message: string = "Internal server error. Please try again."): Response {
  return sendError(res, new BackendError({ kind: "internal", userMessage: message }));
}
