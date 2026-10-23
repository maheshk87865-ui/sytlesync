// ============================================================
// Settings — Validation schemas (Zod)
//
// Settings are stored as a single JSON blob per salon, but the API
// layer validates each section separately using Zod schemas below.
// ============================================================

import { z } from 'zod';

// --- Account settings ---
export const accountSettingsSchema = z.object({
  ownerName: z.string().max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
}).partial();

// --- Business settings ---
export const businessSettingsSchema = z.object({
  timezone: z.string().max(60).optional(),
  currency: z.string().max(3).default('INR').optional(),
  taxRate: z.number().min(0).max(100).optional(),
}).partial();

// --- Notification settings ---
export const notificationSettingsSchema = z.object({
  newBooking: z.boolean().optional(),
  bookingCancelled: z.boolean().optional(),
  bookingRescheduled: z.boolean().optional(),
  upcomingAppointment: z.boolean().optional(),
  newReview: z.boolean().optional(),
  paymentReceived: z.boolean().optional(),
  staffUpdate: z.boolean().optional(),
}).partial();

// --- Booking settings ---
export const bookingSettingsSchema = z.object({
  allowAdvanceDays: z.number().int().min(1).max(365).optional(),
  autoConfirm: z.boolean().optional(),
  requireDeposit: z.boolean().optional(),
  depositPercent: z.number().min(0).max(100).optional(),
  minCancelHours: z.number().int().min(0).max(168).optional(),
}).partial();

// --- Cancellation settings ---
export const cancellationSettingsSchema = z.object({
  freeCancelHours: z.number().int().min(0).max(168).optional(),
  lateCancelFeePercent: z.number().min(0).max(100).optional(),
  noShowFeePercent: z.number().min(0).max(100).optional(),
}).partial();

// --- Payment settings ---
export const paymentSettingsSchema = z.object({
  acceptCash: z.boolean().optional(),
  acceptCard: z.boolean().optional(),
  acceptUPI: z.boolean().optional(),
  acceptNetBanking: z.boolean().optional(),
}).partial();

// --- Security settings ---
export const securitySettingsSchema = z.object({
  twoFactor: z.boolean().optional(),
  loginAlerts: z.boolean().optional(),
}).partial();

// --- Update settings (PATCH) ---
// Accepts any combination of sections
export const updateSettingsSchema = z.object({
  account: accountSettingsSchema.optional(),
  business: businessSettingsSchema.optional(),
  notifications: notificationSettingsSchema.optional(),
  booking: bookingSettingsSchema.optional(),
  cancellation: cancellationSettingsSchema.optional(),
  payment: paymentSettingsSchema.optional(),
  security: securitySettingsSchema.optional(),
}).partial();

// --- Default settings ---
export const DEFAULT_SETTINGS = {
  account: {},
  business: { timezone: 'Asia/Kolkata', currency: 'INR', taxRate: 0 },
  notifications: {
    newBooking: true,
    bookingCancelled: true,
    bookingRescheduled: true,
    upcomingAppointment: true,
    newReview: true,
    paymentReceived: true,
    staffUpdate: false,
  },
  booking: { allowAdvanceDays: 30, autoConfirm: false, requireDeposit: false, depositPercent: 20, minCancelHours: 4 },
  cancellation: { freeCancelHours: 4, lateCancelFeePercent: 30, noShowFeePercent: 50 },
  payment: { acceptCash: true, acceptCard: true, acceptUPI: true, acceptNetBanking: false },
  security: { twoFactor: false, loginAlerts: true },
};

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
