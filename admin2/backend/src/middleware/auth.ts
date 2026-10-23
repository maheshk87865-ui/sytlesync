// ============================================================
// Authentication & Authorization middleware
//
// Layered security:
//   1. authenticate — verifies the JWT (or cookie) and loads the User
//   2. requireSalonMembership — ensures the user's salonId matches the resource's salonId
//   3. requireRole(...roles) — ensures the user has one of the allowed roles
//
// Cross-salon security:
//   Every salon-scoped repository query filters by salonId derived from
//   req.context.salonId (set by authenticate). A user from Salon A literally
//   cannot construct a query that returns Salon B's data — the WHERE clause
//   excludes it.
//
//   On top of that, requireSalonMembership can be used to verify that a
//   specific resource (by id) belongs to the user's salon — useful when
//   a user passes another salon's resource id in the URL.
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../database/prisma.js';
import { verifyAccessToken, extractToken, verifyRefreshToken, verifyTokenHash } from '../utils/auth.js';
import { UnauthorizedError, ForbiddenError, AppError } from './errorHandler.js';
import { logger } from '../config/logger.js';

export type UserRole = 'SALON_OWNER' | 'SALON_MANAGER' | 'SALON_STAFF';

export interface AuthContext {
  requestId: string;
  userId: string;
  salonId: string;
  role: UserRole;
  user?: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
}

declare module 'express' {
  interface Request {
    context?: AuthContext;
  }
}

// ---------- 1. authenticate ----------
// Verifies the access token (Bearer or cookie), loads the user from the DB,
// validates the user is ACTIVE, and attaches req.context.

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      next(new UnauthorizedError('Invalid or expired token'));
      return;
    }

    // Load the user to verify they still exist and are ACTIVE
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, status: true, salonId: true },
    });

    if (!user) {
      next(new UnauthorizedError('User not found'));
      return;
    }

    if (user.status !== 'ACTIVE') {
      // Specific error for suspended/inactive accounts
      next(new AppError('FORBIDDEN', `Account is ${user.status.toLowerCase()}. Contact your salon owner.`));
      return;
    }

    // Defense in depth: verify the token's salonId matches the user's actual salonId
    if (user.salonId !== payload.salonId) {
      logger.warn('Token salonId mismatch — possible tampered token', {
        userId: user.id,
        tokenSalonId: payload.salonId,
        actualSalonId: user.salonId,
      });
      next(new UnauthorizedError('Invalid session'));
      return;
    }

    // Defense in depth: verify the token's role matches the user's actual role
    if (user.role !== payload.role) {
      logger.warn('Token role mismatch — possible stale token after role change', {
        userId: user.id,
        tokenRole: payload.role,
        actualRole: user.role,
      });
      // Re-issue silently isn't safe here; force re-auth
      next(new UnauthorizedError('Session out of date. Please log in again.'));
      return;
    }

    req.context = {
      requestId: (req as unknown as { requestId?: string }).requestId || '',
      userId: user.id,
      salonId: user.salonId,
      role: user.role as UserRole,
      user: { id: user.id, name: user.name, email: user.email, status: user.status },
    };

    next();
  } catch (err) {
    next(err);
  }
}

// ---------- 2. requireRole(...roles) ----------
// Use after `authenticate`. Restricts the route to specific roles.

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.context) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }
    if (!allowedRoles.includes(req.context.role as UserRole)) {
      next(new ForbiddenError(`This action requires one of: ${allowedRoles.join(', ')}`));
      return;
    }
    next();
  };
}

// Convenience presets used across modules
export const requireOwner = requireRole('SALON_OWNER');
export const requireOwnerOrManager = requireRole('SALON_OWNER', 'SALON_MANAGER');
export const requireAnyRole = requireRole('SALON_OWNER', 'SALON_MANAGER', 'SALON_STAFF');

// ---------- 3. requireSalonMembership(model, idParam) ----------
// Use after `authenticate`. Loads the resource by req.params[idParam] and
// verifies its salonId matches the user's salonId. If the resource doesn't
// exist OR belongs to another salon, returns 404 (not 403) — to avoid
// leaking the existence of cross-salon resources.

export function requireSalonMembership(model: 'booking' | 'customer' | 'staff' | 'service' | 'payment' | 'review' | 'notification' | 'supportTicket' | 'blockedSlot' | 'user', idParam = 'id') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.context) {
        next(new UnauthorizedError('Authentication required'));
        return;
      }
      const resourceId = req.params[idParam];
      if (!resourceId) {
        next(); // No id param — let the route handler decide
        return;
      }

      const delegate = (prisma as any)[model];
      const record = await delegate.findUnique({
        where: { id: resourceId },
        select: { salonId: true },
      });

      if (!record) {
        // 404 regardless of whether it exists in another salon — no information leak
        next(new AppError('NOT_FOUND', 'Resource not found'));
        return;
      }

      if (record.salonId !== req.context.salonId) {
        // Cross-salon access attempt — log it, return 404 (not 403) to avoid leaking existence
        logger.warn('Cross-salon access attempt blocked', {
          userId: req.context.userId,
          userSalonId: req.context.salonId,
          resourceModel: model,
          resourceId,
          resourceSalonId: record.salonId,
        });
        next(new AppError('NOT_FOUND', 'Resource not found'));
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

// ---------- 4. requireSalonContext ----------
// Helper for controllers to get the authenticated salon context.
// Throws 401 if no context (defensive — `authenticate` should already enforce).

export function requireSalonContext(req: Request): { salonId: string; userId: string; role: UserRole } {
  if (!req.context) {
    throw new UnauthorizedError('Authentication required');
  }
  return {
    salonId: req.context.salonId,
    userId: req.context.userId,
    role: req.context.role,
  };
}

// ---------- 5. optionalAuth ----------
// Like `authenticate` but does not fail if no token — sets req.context only if valid.
// Useful for endpoints that behave differently for authed vs anon users (e.g. health).

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    if (!payload) {
      next();
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, status: true, salonId: true },
    });
    if (user && user.status === 'ACTIVE' && user.salonId === payload.salonId && user.role === payload.role) {
      req.context = {
        requestId: (req as unknown as { requestId?: string }).requestId || '',
        userId: user.id,
        salonId: user.salonId,
        role: user.role as UserRole,
        user: { id: user.id, name: user.name, email: user.email, status: user.status },
      };
    }
    next();
  } catch {
    next();
  }
}

// ---------- 6. Refresh token verification (internal) ----------

export async function verifyRefreshTokenFromDb(token: string): Promise<{ userId: string } | null> {
  const payload = verifyRefreshToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, status: true, refreshTokenHash: true },
  });
  if (!user || user.status !== 'ACTIVE' || !user.refreshTokenHash) return null;
  const valid = await verifyTokenHash(token, user.refreshTokenHash);
  if (!valid) return null;
  return { userId: user.id };
}
