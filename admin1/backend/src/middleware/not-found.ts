/**
 * Not-found handler — catches unmatched routes.
 */

import type { Request, Response, NextFunction } from "express";
import { Errors } from "../utils/errors";
import { sendError } from "../utils/response";

export function notFound(req: Request, res: Response, _next: NextFunction): void {
  sendError(res, Errors.notFound(`Endpoint not found: ${req.method} ${req.originalUrl}`));
}
