// ============================================================
// Auth — Validation schemas (Zod)
// ============================================================

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSalonSchema = z.object({
  salon: z.object({
    name: z.string().min(1, 'Salon name is required').max(120),
    description: z.string().max(500).optional(),
    area: z.string().min(1).max(80),
    city: z.string().min(1).max(80),
    phone: z.string().min(4).max(20),
    email: z.string().email().optional(),
    timezone: z.string().max(60).optional(),
  }),
  user: z.object({
    name: z.string().min(1, 'Owner name is required').max(120),
    email: z.string().email(),
    password: z.string().min(8),
    phone: z.string().max(20).optional(),
  }),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((d) => d.currentPassword !== d.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

export const createUserSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['SALON_MANAGER', 'SALON_STAFF']).optional(), // Owner-only can't be created here
  phone: z.string().max(20).optional(),
  profileImage: z.string().url().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  role: z.enum(['SALON_MANAGER', 'SALON_STAFF', 'SALON_OWNER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  phone: z.string().max(20).optional(),
  profileImage: z.string().url().optional(),
}).partial();

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterSalonInput = z.infer<typeof registerSalonSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
