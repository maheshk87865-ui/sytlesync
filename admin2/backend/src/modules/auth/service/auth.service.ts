// ============================================================
// Auth — Service (business logic)
//
// Implements:
//   - registerSalon (creates salon + owner)
//   - login (verifies password, checks ACTIVE status, issues tokens)
//   - logout (invalidates refresh token)
//   - refreshSession (rotates refresh token)
//   - me (current user info)
//   - forgotPassword (issues reset token, would email in real env)
//   - resetPassword (validates token, updates password)
//   - changePassword (validates current password, updates)
//   - createUserInSalon (owner/manager creates staff/manager accounts)
//   - listUsersInSalon, updateUser, suspend/activate user
// ============================================================

import { config } from '../../../config/index.js';
import { authRepository } from '../repository/auth.repository.js';
import { AppError, UnauthorizedError, ForbiddenError, NotFoundError } from '../../../middleware/errorHandler.js';
import {
  hashPassword, verifyPassword,
  signAccessToken, signRefreshToken,
  hashToken, verifyTokenHash,
  generateResetToken,
} from '../../../utils/auth.js';
import type { User } from '@prisma/client';

// Safe user — strips password fields before sending to the client
function safeUser(u: User) {
  return {
    id: u.id,
    salonId: u.salonId,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    phone: u.phone,
    profileImage: u.profileImage,
    emailVerifiedAt: u.emailVerifiedAt,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  };
}

export class AuthService {
  async registerSalon(input: {
    salon: { name: string; description?: string; area: string; city: string; phone: string; email?: string; timezone?: string };
    user: { name: string; email: string; password: string; phone?: string };
  }): Promise<{ salon: any; user: any; accessToken: string; refreshToken: string }> {
    const existing = await authRepository.findUserByEmail(input.user.email);
    if (existing) {
      throw new AppError('CONFLICT', 'A user with this email already exists');
    }
    const passwordHash = await hashPassword(input.user.password);
    const { salon, user } = await authRepository.createUserWithSalon({
      salon: input.salon,
      user: { name: input.user.name, email: input.user.email, passwordHash, phone: input.user.phone },
    });
    const accessToken = signAccessToken({ sub: user.id, salonId: salon.id, role: user.role });
    const refreshToken = signRefreshToken(user.id);
    const refreshHash = await hashToken(refreshToken);
    await authRepository.setRefreshTokenHash(user.id, refreshHash);
    return { salon, user: safeUser(user), accessToken, refreshToken };
  }

  async login(email: string, password: string): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    const user = await authRepository.findUserByEmail(email);
    // Use the same error message for "user not found" and "wrong password" to avoid email enumeration
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Invalid email or password');

    if (user.status !== 'ACTIVE') {
      throw new AppError('FORBIDDEN', `Account is ${user.status.toLowerCase()}. Contact your salon owner.`);
    }

    await authRepository.updateLastLoginAt(user.id);

    const accessToken = signAccessToken({ sub: user.id, salonId: user.salonId, role: user.role });
    const refreshToken = signRefreshToken(user.id);
    const refreshHash = await hashToken(refreshToken);
    await authRepository.setRefreshTokenHash(user.id, refreshHash);

    return { user: safeUser(user), accessToken, refreshToken };
  }

  async logout(userId: string): Promise<void> {
    // Invalidate the refresh token so it can no longer mint new access tokens
    await authRepository.setRefreshTokenHash(userId, null);
  }

  async refreshSession(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // 1. Verify the JWT structure
    const { verifyRefreshToken } = await import('../../../utils/auth.js');
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) throw new UnauthorizedError('Invalid refresh token');

    // 2. Load the user + verify ACTIVE + verify the stored hash matches
    const user = await authRepository.findUserById(payload.sub);
    if (!user || user.status !== 'ACTIVE' || !user.refreshTokenHash) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    const valid = await verifyTokenHash(refreshToken, user.refreshTokenHash);
    if (!valid) {
      // Possible token theft — invalidate the family
      await authRepository.setRefreshTokenHash(user.id, null);
      throw new UnauthorizedError('Invalid refresh token');
    }

    // 3. Rotate — issue new tokens, invalidate the old refresh token
    const accessToken = signAccessToken({ sub: user.id, salonId: user.salonId, role: user.role });
    const newRefreshToken = signRefreshToken(user.id);
    const refreshHash = await hashToken(newRefreshToken);
    await authRepository.setRefreshTokenHash(user.id, refreshHash);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async me(userId: string): Promise<any> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');
    return safeUser(user);
  }

  async forgotPassword(email: string): Promise<{ resetToken: string | null }> {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      // Don't reveal whether the email exists — return success either way
      // In a real app, an email with a reset link is sent to the registered address.
      return { resetToken: null };
    }
    const { token, expiresAt } = generateResetToken();
    await authRepository.setResetToken(user.id, token, expiresAt);
    // In production: send the token via email. For dev/test, we return it.
    return { resetToken: config.app.env === 'production' ? null : token };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await authRepository.findUserByResetToken(token);
    if (!user) throw new AppError('BAD_REQUEST', 'Invalid or expired reset token');
    const passwordHash = await hashPassword(newPassword);
    await authRepository.updatePassword(user.id, passwordHash);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');
    const passwordHash = await hashPassword(newPassword);
    await authRepository.updatePassword(user.id, passwordHash);
  }

  // ---------- Salon user management (owner/manager only) ----------

  async createUserInSalon(actorRole: string, salonId: string, input: {
    name: string; email: string; password: string; role: string; phone?: string; profileImage?: string;
  }): Promise<any> {
    // Manager cannot create OWNER or other MANAGER accounts
    if (actorRole === 'SALON_MANAGER' && (input.role === 'SALON_OWNER' || input.role === 'SALON_MANAGER')) {
      throw new ForbiddenError('Managers can only create staff accounts');
    }
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) throw new AppError('CONFLICT', 'A user with this email already exists');

    const passwordHash = await hashPassword(input.password);
    const user = await authRepository.createUserInSalon(salonId, {
      name: input.name, email: input.email, passwordHash, role: input.role, phone: input.phone, profileImage: input.profileImage,
    });
    return safeUser(user);
  }

  async listUsersInSalon(salonId: string): Promise<any[]> {
    const users = await authRepository.listUsersInSalon(salonId);
    return users.map(safeUser);
  }

  async updateUser(actorRole: string, actorUserId: string, salonId: string, targetUserId: string, data: {
    name?: string; email?: string; role?: string; status?: string; phone?: string; profileImage?: string;
  }): Promise<any> {
    const target = await authRepository.findUserById(targetUserId);
    if (!target) throw new NotFoundError('User not found');
    if (target.salonId !== salonId) throw new NotFoundError('User not found'); // cross-salon guard

    // Manager cannot modify owner or other manager accounts
    if (actorRole === 'SALON_MANAGER' && target.role !== 'SALON_STAFF') {
      throw new ForbiddenError('Managers can only modify staff accounts');
    }

    // Manager cannot promote to owner/manager
    if (actorRole === 'SALON_MANAGER' && data.role && (data.role === 'SALON_OWNER' || data.role === 'SALON_MANAGER')) {
      throw new ForbiddenError('Managers can only assign staff role');
    }

    // Prevent self-suspension (a user can't lock themselves out)
    if (actorUserId === targetUserId && data.status && data.status !== 'ACTIVE') {
      throw new AppError('BAD_REQUEST', 'You cannot suspend or deactivate your own account');
    }

    const updated = await authRepository.updateUser(targetUserId, data as any);
    return safeUser(updated);
  }
}

export const authService = new AuthService();
