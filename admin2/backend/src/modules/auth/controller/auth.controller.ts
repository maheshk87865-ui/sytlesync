// ============================================================
// Auth — Controller (HTTP layer)
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { authService } from '../service/auth.service.js';
import { ok, created } from '../../../utils/response.js';
import { setAuthCookie, clearAuthCookie } from '../../../utils/auth.js';
import { ValidationError, UnauthorizedError } from '../../../middleware/errorHandler.js';
import { requireSalonContext } from '../../../middleware/auth.js';
import {
  loginSchema, registerSalonSchema, refreshTokenSchema, forgotPasswordSchema,
  resetPasswordSchema, changePasswordSchema, createUserSchema, updateUserSchema,
} from '../validation/schemas.js';

export class AuthController {
  // ---------- POST /auth/register ----------
  // Public — creates a new salon + owner
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = registerSalonSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const result = await authService.registerSalon(parsed.data);
      setAuthCookie(res, result.accessToken);
      return created(res, result, 'Salon registered successfully');
    } catch (err) { next(err); }
  }

  // ---------- POST /auth/login ----------
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const result = await authService.login(parsed.data.email, parsed.data.password);
      setAuthCookie(res, result.accessToken);
      return ok(res, result, 'Logged in');
    } catch (err) { next(err); }
  }

  // ---------- POST /auth/logout ----------
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // Optional auth — if the user is logged in, invalidate their refresh token
      if (req.context?.userId) {
        await authService.logout(req.context.userId);
      }
      clearAuthCookie(res);
      return ok(res, { success: true }, 'Logged out');
    } catch (err) { next(err); }
  }

  // ---------- POST /auth/refresh ----------
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = refreshTokenSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const result = await authService.refreshSession(parsed.data.refreshToken);
      setAuthCookie(res, result.accessToken);
      return ok(res, result, 'Session refreshed');
    } catch (err) { next(err); }
  }

  // ---------- GET /auth/me ----------
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.context?.userId) {
        return ok(res, { user: null });
      }
      const user = await authService.me(req.context.userId);
      return ok(res, user);
    } catch (err) { next(err); }
  }

  // ---------- POST /auth/forgot-password ----------
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const result = await authService.forgotPassword(parsed.data.email);
      // In dev we return the token for testing; in prod the token is only sent via email
      return ok(res, { sent: true, ...(result.resetToken ? { resetToken: result.resetToken } : {}) }, 'If that email is registered, a reset link has been sent');
    } catch (err) { next(err); }
  }

  // ---------- POST /auth/reset-password ----------
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      await authService.resetPassword(parsed.data.token, parsed.data.newPassword);
      return ok(res, { success: true }, 'Password reset successfully. Please log in.');
    } catch (err) { next(err); }
  }

  // ---------- POST /auth/change-password ----------
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.context?.userId) throw new UnauthorizedError('Authentication required');
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      await authService.changePassword(req.context.userId, parsed.data.currentPassword, parsed.data.newPassword);
      // Force re-auth by clearing the cookie — the user should log in again with the new password
      clearAuthCookie(res);
      return ok(res, { success: true }, 'Password changed. Please log in again.');
    } catch (err) { next(err); }
  }

  // ---------- User management (owner/manager only) ----------

  // GET /auth/users — list users in the current salon
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const users = await authService.listUsersInSalon(salonId);
      return ok(res, { items: users, total: users.length });
    } catch (err) { next(err); }
  }

  // POST /auth/users — create a new user in the current salon
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId, role } = requireSalonContext(req);
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const user = await authService.createUserInSalon(role, salonId, {
        ...parsed.data,
        role: parsed.data.role ?? 'SALON_STAFF',
      });
      return created(res, user, 'User created');
    } catch (err) { next(err); }
  }

  // PUT /auth/users/:id — update a user in the current salon
  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId, role, userId: actorUserId } = requireSalonContext(req);
      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const user = await authService.updateUser(role, actorUserId, salonId, req.params.id, parsed.data);
      return ok(res, user, 'User updated');
    } catch (err) { next(err); }
  }
}

export const authController = new AuthController();
