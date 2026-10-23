// ============================================================
// Bookings — Validation schemas (Zod)
// ============================================================

import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

// --- Create booking ---
export const createBookingSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1).max(120),
  customerPhone: z.string().min(4).max(20),
  customerEmail: z.string().email().optional(),
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD'),
  startTime: z.string().regex(timeRegex, 'Time must be HH:MM'),
  notes: z.string().max(500).optional(),
  paymentStatus: z.enum(['PENDING', 'PAID']).optional(),
});

// --- Update booking status (POST /:id/status) ---
export const updateBookingStatusSchema = z.object({
  status: z.enum(['PENDING', 'UPCOMING', 'COMPLETED', 'CANCELLED']),
  reason: z.string().max(200).optional(),
});

// --- Complete booking (POST /:id/complete) ---
export const completeBookingSchema = z.object({}).optional();

// --- Cancel booking (POST /:id/cancel) ---
export const cancelBookingSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(200),
});

// --- Reschedule booking (POST /:id/reschedule) ---
export const rescheduleBookingSchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD'),
  startTime: z.string().regex(timeRegex, 'Time must be HH:MM'),
});

// --- List filters (query params) ---
export const bookingListFilterSchema = z.object({
  tab: z.enum(['ALL', 'TODAY', 'PENDING', 'UPCOMING', 'COMPLETED', 'CANCELLED']).optional(),
  date: z.string().regex(dateRegex).optional(),
  dateFrom: z.string().regex(dateRegex).optional(),
  dateTo: z.string().regex(dateRegex).optional(),
  status: z.enum(['PENDING', 'UPCOMING', 'COMPLETED', 'CANCELLED']).optional(),
  staffId: z.string().optional(),
  serviceId: z.string().optional(),
  customerId: z.string().optional(),
  search: z.string().max(120).optional(),
}).partial();

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
export type BookingListFilterInput = z.infer<typeof bookingListFilterSchema>;
