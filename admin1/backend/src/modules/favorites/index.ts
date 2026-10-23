/**
 * Favorites module — saved salons.
 * ------------------------------------------------------------
 * Endpoints (all require auth):
 *   GET    /api/v1/favorites            → list saved salons (with salon data)
 *   POST   /api/v1/favorites/:salonId   → add to favorites
 *   DELETE /api/v1/favorites/:salonId   → remove from favorites
 *   GET    /api/v1/favorites/:salonId/check → check if favorited
 *   POST   /api/v1/favorites/:salonId/toggle → toggle favorite
 */

import { Router } from "express";
import { z } from "zod";
import { getDb } from "../../database";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { validateParams } from "../../middleware/validate-request";

export const router = Router();

const salonIdParam = z.object({ salonId: z.string().uuid() });

async function list(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const favorites = await db.favorite.findMany({
    where: { customerId: req.customerId! },
    include: { salon: true },
    orderBy: { createdAt: "desc" },
  }).catch((e) => { throw Errors.database("Could not load favorites.", e); });
  return sendSuccess(res, favorites.map((f: any) => f.salon).filter(Boolean));
}

async function add(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { salonId } = req.params;
  // Verify the salon exists + is published
  const salon = await db.salon.findFirst({ where: { id: salonId, isPublished: true } }).catch(() => null);
  if (!salon) {
    return sendError(res, Errors.notFound("Salon not found."));
  }
  try {
    await db.favorite.create({
      data: { customerId: req.customerId!, salonId },
    });
    return sendSuccess(res, { salonId, favorited: true }, "Added to favorites", 201);
  } catch (e: any) {
    // P2002 = unique violation → already favorited
    if (e?.code === "P2002") {
      return sendSuccess(res, { salonId, favorited: true }, "Already in favorites");
    }
    throw Errors.database("Could not add to favorites.", e);
  }
}

async function remove(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { salonId } = req.params;
  await db.favorite.deleteMany({
    where: { customerId: req.customerId!, salonId },
  }).catch((e) => { throw Errors.database("Could not remove from favorites.", e); });
  return sendSuccess(res, { salonId, favorited: false }, "Removed from favorites");
}

async function check(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { salonId } = req.params;
  const existing = await db.favorite.findFirst({
    where: { customerId: req.customerId!, salonId },
    select: { id: true },
  }).catch(() => null);
  return sendSuccess(res, { favorited: !!existing });
}

async function toggle(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { salonId } = req.params;
  const existing = await db.favorite.findFirst({
    where: { customerId: req.customerId!, salonId },
  }).catch(() => null);
  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    return sendSuccess(res, { salonId, favorited: false }, "Removed from favorites");
  }
  await db.favorite.create({ data: { customerId: req.customerId!, salonId } }).catch(() => { /* best-effort */ });
  return sendSuccess(res, { salonId, favorited: true }, "Added to favorites");
}

router.get("/", requireAuth, list);
router.post("/:salonId", requireAuth, validateParams(salonIdParam), add);
router.delete("/:salonId", requireAuth, validateParams(salonIdParam), remove);
router.get("/:salonId/check", requireAuth, validateParams(salonIdParam), check);
router.post("/:salonId/toggle", requireAuth, validateParams(salonIdParam), toggle);

export default router;
