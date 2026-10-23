/**
 * Audit Log Service — safe audit records for important customer actions.
 * ------------------------------------------------------------
 * Records:
 *   - Booking created/cancelled/rescheduled
 *   - Payment status changed
 *   - Review created
 *   - Profile changed
 *
 * Never stores: passwords, tokens, CVV, card numbers, or any
 * sensitive data. Only the action type + relevant IDs + timestamp.
 */

import type { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

export type AuditAction =
  | "BOOKING_CREATED"
  | "BOOKING_CANCELLED"
  | "BOOKING_COMPLETED"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_REBOOKED"
  | "PAYMENT_CREATED"
  | "PAYMENT_VERIFIED"
  | "PAYMENT_FAILED"
  | "PAYMENT_REFUNDED"
  | "REVIEW_CREATED"
  | "REVIEW_EDITED"
  | "REVIEW_DELETED"
  | "PROFILE_UPDATED"
  | "PREFERENCES_UPDATED"
  | "SLOT_HOLD_PLACED"
  | "SLOT_HOLD_CONFIRMED"
  | "SLOT_HOLD_RELEASED"
  | "AI_ANALYSIS"
  | "AI_TRYON"
  | "FAVORITE_ADDED"
  | "FAVORITE_REMOVED"
  | "SUPPORT_TICKET_CREATED"
  | "SUPPORT_TICKET_REPLIED";

/**
 * Write an audit log entry. Best-effort — never blocks the request
 * if logging fails.
 */
export async function audit(
  db: PrismaClient,
  opts: {
    customerId: string;
    action: AuditAction;
    entityType?: string;      // "booking" | "payment" | "review" | "profile" | ...
    entityId?: string;          // ID of the affected record
    details?: Record<string, any>; // safe metadata (no secrets)
  }
): Promise<void> {
  const entry = {
    customerId: opts.customerId,
    action: opts.action,
    entityType: opts.entityType || null,
    entityId: opts.entityId || null,
    details: opts.details ? JSON.stringify(opts.details) : null,
    timestamp: new Date().toISOString(),
  };

  // Log to structured logger (always works — even without DB)
  logger.info({ audit: entry }, `AUDIT: ${opts.action}`);

  // Best-effort DB write (if AuditLog model exists)
  try {
    await (db as any).auditLog?.create({
      data: {
        customerId: opts.customerId,
        action: opts.action,
        entityType: opts.entityType || null,
        entityId: opts.entityId || null,
        details: entry.details,
      },
    });
  } catch {
    // AuditLog table might not exist yet — that's OK, the logger
    // entry is the fallback. Don't let audit logging break the request.
  }
}
