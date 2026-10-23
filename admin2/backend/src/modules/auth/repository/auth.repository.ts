// ============================================================
// Auth — Repository (data access)
// ============================================================

import { prisma } from '../../../database/prisma.js';
import type { User, Salon } from '@prisma/client';

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async createUserWithSalon(input: {
    salon: { name: string; description?: string; area: string; city: string; phone: string; email?: string; timezone?: string };
    user: { name: string; email: string; passwordHash: string; phone?: string };
  }): Promise<{ salon: Salon; user: User }> {
    return prisma.$transaction(async (tx) => {
      const salon = await tx.salon.create({
        data: {
          name: input.salon.name,
          description: input.salon.description,
          area: input.salon.area,
          city: input.salon.city,
          phone: input.salon.phone,
          email: input.salon.email,
          timezone: input.salon.timezone ?? 'Asia/Kolkata',
          // Default business hours: Mon-Sat 09:00-20:00, Sunday closed
          businessHours: {
            monday:    { open: '09:00', close: '20:00', closed: false },
            tuesday:   { open: '09:00', close: '20:00', closed: false },
            wednesday: { open: '09:00', close: '20:00', closed: false },
            thursday:  { open: '09:00', close: '20:00', closed: false },
            friday:    { open: '09:00', close: '20:00', closed: false },
            saturday:  { open: '09:00', close: '20:00', closed: false },
            sunday:    { closed: true },
          },
        },
      });
      const user = await tx.user.create({
        data: {
          salonId: salon.id,
          name: input.user.name,
          email: input.user.email,
          passwordHash: input.user.passwordHash,
          role: 'SALON_OWNER',
          status: 'ACTIVE',
          phone: input.user.phone,
        },
      });
      return { salon, user };
    });
  }

  async createUserInSalon(salonId: string, input: { name: string; email: string; passwordHash: string; role: string; phone?: string; profileImage?: string }): Promise<User> {
    return prisma.user.create({
      data: {
        salonId,
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role as any,
        status: 'ACTIVE',
        phone: input.phone,
        profileImage: input.profileImage,
      },
    });
  }

  async listUsersInSalon(salonId: string): Promise<User[]> {
    return prisma.user.findMany({
      where: { salonId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  async updateLastLoginAt(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async setRefreshTokenHash(userId: string, hash: string | null): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  async setResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { resetToken: token, resetTokenExpiresAt: expiresAt },
    });
  }

  async clearResetToken(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { resetToken: null, resetTokenExpiresAt: null },
    });
  }

  async findUserByResetToken(token: string): Promise<User | null> {
    const user = await prisma.user.findFirst({
      where: { resetToken: token },
    });
    if (!user) return null;
    if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) return null;
    return user;
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { passwordHash, resetToken: null, resetTokenExpiresAt: null, refreshTokenHash: null },
    });
  }
}

export const authRepository = new AuthRepository();
