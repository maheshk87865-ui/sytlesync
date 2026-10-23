/**
 * Global error-handling middleware.
 * ------------------------------------------------------------
 * Mounted at the end of the Express pipeline. Catches any error
 * thrown by a route handler or upstream middleware, logs it with
 * request context, and returns a user-friendly JSON response.
 *
 * NEVER returns database internals / stack traces to the customer.
 */

import type { ErrorRequestHandler, Request, Response } from "express";
import { ZodError } from "zod";
import { BackendError, Errors, toBackendError } from "../utils/errors";
import { sendError } from "../utils/response";
import { logger } from "../utils/logger";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = (req.headers["x-request-id"] as string) || "n/a";
  const userId = (req as any).customerId || "anonymous";
  const endpoint = `${req.method} ${req.originalUrl || req.url}`;

  // Zod validation errors — convert to a BackendError(validation)
  if (err instanceof ZodError) {
    const be = Errors.validation("Please check your input and try again.", err.flatten());
    logger.warn(
      { requestId, userId, endpoint, kind: be.kind, details: err.flatten() },
      "Validation error"
    );
    return sendError(res, be);
  }

  // Already-typed BackendError — log + return
  if (err instanceof BackendError) {
    if (isServerError(err)) {
      logger.error({ requestId, userId, endpoint, kind: err.kind, detail: err.detail }, err.message);
    } else {
      logger.warn({ requestId, userId, endpoint, kind: err.kind }, err.message);
    }
    return sendError(res, err);
  }

  // Unknown error — wrap + log full detail, return generic 500
  const wrapped = toBackendError(err);
  logger.error(
    { requestId, userId, endpoint, kind: wrapped.kind, detail: wrapped.detail, stack: err instanceof Error ? err.stack : undefined },
    wrapped.message
  );
  return sendError(res, wrapped);
};

function isServerError(err: BackendError): boolean {
  return err.kind === "database" || err.kind === "internal" || err.kind === "network";
}

// Re-export for callers — convenient
export { BackendError, Errors };
