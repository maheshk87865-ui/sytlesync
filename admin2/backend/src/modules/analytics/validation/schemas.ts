// ============================================================
// Analytics — Validation schemas
// ============================================================

import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const analyticsQuerySchema = z.object({
  range: z.enum(['TODAY', 'YESTERDAY', '7D', '30D', 'MONTH', 'LAST_MONTH', 'ALL', 'CUSTOM']).default('30D'),
  dateFrom: z.string().regex(dateRegex).optional(),
  dateTo: z.string().regex(dateRegex).optional(),
}).partial();

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
