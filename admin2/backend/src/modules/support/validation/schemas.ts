// ============================================================
// Support — Validation schemas (Zod)
// ============================================================

import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  category: z.enum(['BOOKING', 'PAYMENT', 'TECHNICAL', 'ACCOUNT', 'OTHER']),
  message: z.string().min(1, 'Message is required').max(5000),
});

export const respondTicketSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type RespondTicketInput = z.infer<typeof respondTicketSchema>;
