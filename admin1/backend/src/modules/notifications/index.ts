/**
 * Notifications module.
 * ------------------------------------------------------------
 * Endpoints (all require auth):
 *   GET    /api/v1/notifications             → list (optional ?only_unread=true)
 *   GET    /api/v1/notifications/unread-count → unread count
 *   PATCH  /api/v1/notifications/:id/read   → mark one as read
 *   POST   /api/v1/notifications/read-all    → mark all as read
 *   DELETE /api/v1/notifications/clear-read  → delete read notifications
 */

import { Router } from "express";
import { z } from "zod";
import { getDb } from "../../database";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { validateParams, validateQuery } from "../../middleware/validate-request";

export const router = Router();

const listQuery = z.object({
  only_unread: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const idParam = z.object({ id: z.string().uuid() });

async function list(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { only_unread, limit } = (req.query as any);
  const where: any = { customerId: req.customerId! };
  if (only_unread === "true") where.read = false;
  const items = await db.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit ?? 50,
  }).catch((e) => { throw Errors.database("Could not load notifications.", e); });
  return sendSuccess(res, items);
}

async function unreadCount(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const count = await db.notification.count({
    where: { customerId: req.customerId!, read: false },
  }).catch((e) => { throw Errors.database("Could not count notifications.", e); });
  return sendSuccess(res, { count });
}

async function markRead(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { id } = req.params;
  // Verify ownership
  const existing = await db.notification.findFirst({
    where: { id, customerId: req.customerId! },
  }).catch(() => null);
  if (!existing) {
    return sendError(res, Errors.notFound("Notification not found."));
  }
  await db.notification.update({
    where: { id },
    data: { read: true },
  }).catch((e) => { throw Errors.database("Could not update the notification.", e); });
  return sendSuccess(res, { id, read: true }, "Marked as read");
}

async function markAllRead(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  await db.notification.updateMany({
    where: { customerId: req.customerId!, read: false },
    data: { read: true },
  }).catch((e) => { throw Errors.database("Could not mark all as read.", e); });
  return sendSuccess(res, { allRead: true }, "All notifications marked as read");
}

async function clearRead(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const result = await db.notification.deleteMany({
    where: { customerId: req.customerId!, read: true },
  }).catch((e) => { throw Errors.database("Could not clear read notifications.", e); });
  return sendSuccess(res, { cleared: result.count }, `${result.count} notification(s) cleared`);
}

router.get("/unread-count", requireAuth, unreadCount);
router.post("/read-all", requireAuth, markAllRead);
router.delete("/clear-read", requireAuth, clearRead);
router.patch("/:id/read", requireAuth, validateParams(idParam), markRead);
router.get("/", requireAuth, validateQuery(listQuery), list);

export default router;
