// ============================================================
// Availability — Validation schemas
// ============================================================

import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

// --- GET /availability query params ---
export const availabilityQuerySchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD'),
  staffId: z.string().min(1).optional(),
  serviceId: z.string().min(1).optional(),
}).refine((d) => d.staffId || d.serviceId, {
  message: 'At least one of staffId or serviceId is required',
  path: ['staffId'],
});

// --- POST /availability/block (create a blocked slot) ---
export const blockReasons = [
  'Staff meeting', 'Maintenance', 'Private event', 'Personal', 'Salon closed', 'Other',
] as const;

export const createBlockSchema = z.object({
  date: z.string().regex(dateRegex),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
  reason: z.enum(blockReasons).optional(),
  reasonText: z.string().max(200).optional(),
  staffId: z.string().optional(), // optional: if null, salon-wide; if set, staff-specific
  type: z.enum(['BLOCKED', 'BREAK']).default('BLOCKED'),
}).refine((d) => d.startTime < d.endTime, {
  message: 'startTime must be before endTime',
  path: ['endTime'],
});

// --- POST /availability/break (create a break) ---
export const createBreakSchema = z.object({
  date: z.string().regex(dateRegex),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
  reason: z.string().max(200).optional(),
  staffId: z.string().optional(),
}).refine((d) => d.startTime < d.endTime, {
  message: 'startTime must be before endTime',
  path: ['endTime'],
});

export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type CreateBreakInput = z.infer<typeof createBreakSchema>;
