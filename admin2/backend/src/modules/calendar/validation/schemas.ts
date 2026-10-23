// ============================================================
// Calendar — Validation schemas
// ============================================================

import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const calendarQuerySchema = z.object({
  view: z.enum(['MONTH', 'WEEK', 'DAY']).default('WEEK'),
  startDate: z.string().regex(dateRegex).optional(),
  endDate: z.string().regex(dateRegex).optional(),
  staffId: z.string().optional(),
}).refine((d) => {
  // If both startDate and endDate are provided, startDate must be <= endDate
  if (d.startDate && d.endDate) return d.startDate <= d.endDate;
  return true;
}, {
  message: 'startDate must be before or equal to endDate',
  path: ['startDate'],
});

export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>;
