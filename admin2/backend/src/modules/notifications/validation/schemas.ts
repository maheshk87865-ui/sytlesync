// ============================================================
// Notifications — Validation schemas (Zod)
// ============================================================

import { z } from 'zod';

export const notificationListFilterSchema = z.object({
  unreadOnly: z.string().optional().transform((v) => v === 'true'),
  type: z.enum([
    'NEW_BOOKING', 'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED', 'UPCOMING_APPOINTMENT',
    'PAYMENT_RECEIVED', 'NEW_REVIEW', 'STAFF_UPDATE', 'SYSTEM_NOTIFICATION',
  ]).optional(),
}).partial();

export const createNotificationSchema = z.object({
  type: z.enum([
    'NEW_BOOKING', 'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED', 'UPCOMING_APPOINTMENT',
    'PAYMENT_RECEIVED', 'NEW_REVIEW', 'STAFF_UPDATE', 'SYSTEM_NOTIFICATION',
  ]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(500),
  userId: z.string().optional(),  // null = all salon users
  metadata: z.record(z.string(), z.any()).optional(),
  linkType: z.string().max(50).optional(),
  linkId: z.string().max(100).optional(),
});

export type NotificationListFilterInput = z.infer<typeof notificationListFilterSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
