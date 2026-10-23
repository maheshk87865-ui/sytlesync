/**
 * Response helpers — every endpoint returns the same envelope shape:
 *   { success: true,  data: T, message?: string }
 *   { success: false, error: { code, message, details? } }
 */

import type { Response } from "express";
import { BackendError } from "./errors";

export function sendSuccess<T>(res: Response, data: T, message?: string, status = 200): Response {
  return res.status(status).json({ success: true, data, message });
}

export function sendError(res: Response, err: BackendError | Error, status?: number): Response {
  if (err instanceof BackendError) {
    return res.status(status ?? err.httpStatus).json({
      success: false,
      error: { code: err.kind, message: err.message },
    });
  }
  return res.status(status ?? 500).json({
    success: false,
    error: { code: "internal", message: "Something went wrong." },
  });
}

export function paginate<T>(items: T[], page: number, limit: number, total: number) {
  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    },
  };
}
