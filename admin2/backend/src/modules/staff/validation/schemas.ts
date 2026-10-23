// ============================================================
// Staff — Validation schemas (Zod)
// ============================================================

import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createStaffSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF']).optional(),
  profileImage: z.string().url().optional(),
  experienceYears: z.number().int().min(0).max(80).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  serviceIds: z.array(z.string()).optional(),
  schedule: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(timeRegex).optional(),
    endTime: z.string().regex(timeRegex).optional(),
    isWorking: z.boolean().optional(),
  })).optional(),
});

export const updateStaffSchema = createStaffSchema.partial();

// --- PATCH /staff/:id/services ---
// Replaces the entire set of service assignments for this staff member.
export const updateStaffServicesSchema = z.object({
  serviceIds: z.array(z.string()).min(0, 'Must be an array (empty to clear all)'),
});

// --- PATCH /staff/:id/schedule ---
// Replaces the entire weekly schedule (7 entries, one per day).
export const scheduleEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex).optional(),
  endTime: z.string().regex(timeRegex).optional(),
  isWorking: z.boolean(),
}).refine((d) => d.isWorking ? (d.startTime && d.endTime) : true, {
  message: 'When working, both startTime and endTime are required',
  path: ['startTime'],
}).refine((d) => d.isWorking ? (d.startTime! < d.endTime!) : true, {
  message: 'startTime must be before endTime',
  path: ['endTime'],
});

export const updateStaffScheduleSchema = z.object({
  schedule: z.array(scheduleEntrySchema).length(7, 'Must provide exactly 7 entries (one per day)'),
});

// --- POST /staff/:id/unavailability ---
export const createUnavailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
  reason: z.string().max(200).optional(),
}).refine((d) => d.startTime < d.endTime, {
  message: 'startTime must be before endTime',
  path: ['endTime'],
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type UpdateStaffServicesInput = z.infer<typeof updateStaffServicesSchema>;
export type UpdateStaffScheduleInput = z.infer<typeof updateStaffScheduleSchema>;
export type CreateUnavailabilityInput = z.infer<typeof createUnavailabilitySchema>;
