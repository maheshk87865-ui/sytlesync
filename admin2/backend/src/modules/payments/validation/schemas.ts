// ============================================================
// Payments — Validation schemas (Zod)
// ============================================================

import { z } from 'zod';

// --- List filters ---
export const paymentListFilterSchema = z.object({
  range: z.enum(['TODAY', 'WEEK', 'MONTH', 'LAST_MONTH', 'ALL', 'CUSTOM']).optional(),
  status: z.enum(['ALL', 'PAID', 'PENDING', 'REFUNDED', 'FAILED', 'PARTIALLY_REFUNDED']).optional(),
  method: z.enum(['CASH', 'UPI', 'CARD', 'NET_BANKING', 'OTHER']).optional(),
  search: z.string().max(120).optional(),
  customStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  customEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).partial();

// --- Update payment status ---
export const updatePaymentStatusSchema = z.object({
  status: z.enum(['PAID', 'PENDING', 'REFUNDED', 'FAILED', 'PARTIALLY_REFUNDED']),
  transactionId: z.string().max(100).optional(),
  provider: z.string().max(50).optional(),
});

// --- Refund ---
export const refundPaymentSchema = z.object({
  reason: z.string().min(1, 'Refund reason is required').max(200),
  amount: z.number().int().min(1).optional(), // partial refund amount; if omitted, full refund
});

// --- Update method ---
export const updatePaymentMethodSchema = z.object({
  method: z.enum(['CASH', 'CARD', 'UPI', 'NET_BANKING', 'OTHER']),
});

// --- Revenue summary query ---
export const revenueSummarySchema = z.object({
  customStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  customEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).partial();

export type PaymentListFilterInput = z.infer<typeof paymentListFilterSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
