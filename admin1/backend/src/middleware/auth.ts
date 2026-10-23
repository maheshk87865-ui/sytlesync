/**
 * Auth middleware — verifies JWT and attaches user identity to req.
 * ------------------------------------------------------------
 * Two exported functions:
 *   - requireAuth: throws 401 if no/invalid token
 *   - optionalAuth: attaches userId if a valid token is present,
 *     but does NOT throw if missing
 *
 * The token is expected in `Authorization: Bearer <jwt>` header.
 *
 * JWT payload: { userId, role, email }
 * The `userId` is the server-side authenticated user ID — it is
 * NEVER trusted from the frontend. All profile/booking/etc queries
 * filter by this `userId`, so Customer A can never access
 * Customer B's data.
 *
 * Role enforcement:
 *   - requireAuth — any authenticated user (any role)
 *   - requireRole("CUSTOMER") — only users with the CUSTOMER role
 *
 * Customer frontend always operates with role=CUSTOMER. The role
 * is set server-side at signup time and cannot be overridden by the
 * frontend.
 */

import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "../utils/password";
import { Errors } from "../utils/errors";
import { sendError } from "../utils/response";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  role?: string;
  email?: string;
  customerId?: string; // linked Customer record ID — used by bookings/reviews/favorites
}

export function attachUser(req: AuthenticatedRequest, payload: AccessTokenPayload): void {
  req.userId = payload.userId;
  req.role = payload.role;
  req.email = payload.email;
  req.customerId = payload.customerId;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, Errors.auth("Authentication required. Please sign in."));
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    attachUser(req, payload);
    next();
  } catch {
    sendError(res, Errors.auth("Your session has expired. Please sign in again."));
  }
}

export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // First require auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      sendError(res, Errors.auth("Authentication required. Please sign in."));
      return;
    }
    const token = authHeader.slice(7);
    try {
      const payload = verifyAccessToken(token);
      attachUser(req, payload);
      // Check role
      if (payload.role !== role) {
        sendError(res, Errors.permission("You do not have permission to access this resource."));
        return;
      }
      next();
    } catch {
      sendError(res, Errors.auth("Your session has expired. Please sign in again."));
    }
  };
}

/** Convenience — customer-only access (the customer frontend) */
export const requireCustomer = requireRole("CUSTOMER");

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    attachUser(req, payload);
  } catch {
    // Invalid token — ignore for optional auth
  }
  next();
}
