/**
 * Categories module — public service categories list.
 * ------------------------------------------------------------
 * Endpoint:
 *   GET /api/v1/categories → all categories with service + salon counts
 *
 * This is a convenience alias for GET /api/v1/services/categories
 * since the user spec lists it as a top-level endpoint.
 */

import { Router } from "express";
import { getDb, isDbConfigured } from "../../database";
import { config } from "../../config";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";

export const router = Router();

async function list(_req: any, res: any, _next: any) {
  if (!config.isDatabaseConfigured || !isDbConfigured()) {
    return sendError(res, Errors.config("Database is not configured. Set DATABASE_URL in .env"));
  }
  const db = getDb();

  const cats = await db.serviceCategory.findMany().catch((e) => {
    throw Errors.database("Could not load categories.", e);
  });

  // Get counts per category
  const serviceCounts = await db.service.groupBy({
    by: ["category"],
    where: { status: "active" },
    _count: { id: true },
  }).catch(() => []);

  const salonCounts = await db.salonService.groupBy({
    by: ["category"],
    where: { isPublished: true, status: "active" },
    _count: { salonId: true },
  }).catch(() => []);

  const serviceCountMap = new Map<string, number>(
    serviceCounts.map((s: any) => [s.category as string, s._count.id as number] as [string, number])
  );
  const salonCountMap = new Map<string, number>(
    salonCounts.map((s: any) => [s.category as string, s._count.salonId as number] as [string, number])
  );

  return sendSuccess(res, cats.map((c: any) => ({
    ...c,
    serviceCount: serviceCountMap.get(c.name) ?? 0,
    salonCount: salonCountMap.get(c.name) ?? 0,
  })));
}

router.get("/", list);

export default router;
