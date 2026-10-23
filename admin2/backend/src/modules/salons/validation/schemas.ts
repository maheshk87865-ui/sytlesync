// ============================================================
// Salons — Validation schemas (Zod)
// ============================================================

import { z } from 'zod';

// --- Business hours (per-day) ---
// Each day is either open (open+close time) or closed.
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const dayHoursSchema = z.object({
  open: z.string().regex(timeRegex).optional(),
  close: z.string().regex(timeRegex).optional(),
  closed: z.boolean(),
}).refine((d) => d.closed || (d.open && d.close), {
  message: 'When not closed, both open and close are required',
  path: ['open'],
}).refine((d) => d.closed || (d.open! < d.close!), {
  message: 'open time must be before close time',
  path: ['close'],
});

export const businessHoursSchema = z.object({
  monday: dayHoursSchema,
  tuesday: dayHoursSchema,
  wednesday: dayHoursSchema,
  thursday: dayHoursSchema,
  friday: dayHoursSchema,
  saturday: dayHoursSchema,
  sunday: dayHoursSchema,
});

export type BusinessHours = z.infer<typeof businessHoursSchema>;
export type DayHours = z.infer<typeof dayHoursSchema>;

// Default business hours (used when a salon is created without specifying)
export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday:    { open: '09:00', close: '20:00', closed: false },
  tuesday:   { open: '09:00', close: '20:00', closed: false },
  wednesday: { open: '09:00', close: '20:00', closed: false },
  thursday:  { open: '09:00', close: '20:00', closed: false },
  friday:    { open: '09:00', close: '20:00', closed: false },
  saturday:  { open: '09:00', close: '20:00', closed: false },
  sunday:    { closed: true },
};

// --- Salon profile update (PATCH /api/v1/salon) ---
export const updateSalonSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  about: z.string().max(2000).optional(),
  address: z.string().max(200).optional(),
  area: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  timezone: z.string().max(60).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
}).partial();

export type UpdateSalonInput = z.infer<typeof updateSalonSchema>;

// --- Salon status (PATCH /api/v1/salon/status) ---
export const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED']),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

// --- Temporary closure (POST /api/v1/salon/closure, DELETE /api/v1/salon/closure) ---
export const setClosureSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  reason: z.string().max(200).optional(),
}).refine((d) => new Date(d.end) > new Date(d.start), {
  message: 'Closure end must be after start',
  path: ['end'],
});

export type SetClosureInput = z.infer<typeof setClosureSchema>;
