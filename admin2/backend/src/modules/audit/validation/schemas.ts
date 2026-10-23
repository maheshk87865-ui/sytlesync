// ============================================================
// Audit — Validation schemas
// ============================================================

import { z } from 'zod';

export const auditQuerySchema = z.object({
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).partial();

// Valid audit actions
export const AUDIT_ACTIONS = [
  'user.login',
  'service.created',
  'service.price_changed',
  'service.updated',
  'service.deactivated',
  'service.reactivated',
  'service.deleted',
  'staff.added',
  'staff.removed',
  'staff.updated',
  'booking.created',
  'booking.cancelled',
  'booking.completed',
  'booking.rescheduled',
  'booking.status_changed',
  'slot.blocked',
  'slot.unblocked',
  'break.added',
  'break.removed',
  'payment.status_changed',
  'payment.refunded',
  'review.reply_created',
  'settings.changed',
  'salon.status_changed',
  'salon.profile_updated',
  'salon.business_hours_changed',
  'salon.closure_set',
  'salon.closure_cleared',
  'user.created',
  'user.updated',
] as const;

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
