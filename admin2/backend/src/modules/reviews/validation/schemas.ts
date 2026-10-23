// ============================================================
// Reviews — Validation schemas (Zod)
// ============================================================

import { z } from 'zod';

export const createReviewSchema = z.object({
  customerId: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().optional(),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().min(1, 'Comment is required').max(1000),
  bookingId: z.string().optional(),
});

export const replyReviewSchema = z.object({
  reply: z.string().min(1, 'Reply is required').max(1000),
});

// --- List filters ---
export const reviewListFilterSchema = z.object({
  rating: z.enum(['1', '2', '3', '4', '5']).optional(),
  serviceId: z.string().optional(),
  staffId: z.string().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasReply: z.enum(['true', 'false']).optional(),
}).partial();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ReplyReviewInput = z.infer<typeof replyReviewSchema>;
export type ReviewListFilterInput = z.infer<typeof reviewListFilterSchema>;
