/**
 * Search module — unified search across salons + services + categories + areas.
 * ------------------------------------------------------------
 * Endpoints (public):
 *   GET /api/v1/search               → unified search (returns salons + services)
 *   GET /api/v1/search/salons        → search salons by name/tagline/area/city
 *   GET /api/v1/search/services      → search services by name/category/description
 *   GET /api/v1/search/areas        → list all areas (for filter dropdowns)
 *   GET /api/v1/search/suggest       → autocomplete suggestions
 *
 * Search targets:
 *   • Salon name
 *   • Service name
 *   • Category
 *   • Area
 *
 * Uses database `contains` with case-insensitive mode for broad
 * matching. For production with large datasets, switch to
 * PostgreSQL full-text search (tsvector + GIN index).
 */

import { Router } from "express";
import { z } from "zod";
import { getDb, isDbConfigured } from "../../database";
import { config } from "../../config";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { validateQuery } from "../../middleware/validate-request";

export const router = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required").max(200),
  city: z.string().max(120).optional(),
  area: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const suggestSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(10).optional(),
});

function guardDb(res: any): boolean {
  if (!config.isDatabaseConfigured || !isDbConfigured()) {
    sendError(res, Errors.config("Database is not configured. Set DATABASE_URL in .env"));
    return false;
  }
  return true;
}

/** GET /api/v1/search/salons — search salons */
async function searchSalons(req: any, res: any, _next: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const { q, city, area, limit } = req.query;

  const where: any = {
    isPublished: true,
    status: "active",
    OR: [
      { name: { contains: q, } },
      { tagline: { contains: q, } },
      { description: { contains: q, } },
      { area: { contains: q, } },
      { city: { contains: q, } },
      { category: { contains: q, } },
    ],
  };
  if (city) where.city = city;
  if (area) where.area = area;

  const salons = await db.salon.findMany({
    where,
    orderBy: { rating: "desc" },
    take: limit ?? 20,
    select: {
      id: true, name: true, tagline: true, category: true, logo: true,
      coverImage: true, rating: true, reviewCount: true, distanceKm: true,
      priceFrom: true, openUntil: true, isOpen: true, verified: true,
      city: true, area: true, amenities: true,
    },
  }).catch((e) => { throw Errors.database("Search failed.", e); });

  return sendSuccess(res, salons);
}

/** GET /api/v1/search/services — search services (master catalog) */
async function searchServices(req: any, res: any, _next: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const { q, limit } = req.query;

  const services = await db.service.findMany({
    where: {
      status: "active",
      OR: [
        { name: { contains: q, } },
        { description: { contains: q, } },
        { category: { contains: q, } },
      ],
    },
    orderBy: { name: "asc" },
    take: limit ?? 20,
  }).catch((e) => { throw Errors.database("Search failed.", e); });

  return sendSuccess(res, services);
}

/** GET /api/v1/search — unified search (salons + services) */
async function searchAll(req: any, res: any, _next: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const { q, city, area, limit } = req.query;

  const salonWhere: any = {
    isPublished: true,
    status: "active",
    OR: [
      { name: { contains: q, } },
      { tagline: { contains: q, } },
      { area: { contains: q, } },
      { city: { contains: q, } },
    ],
  };
  if (city) salonWhere.city = city;
  if (area) salonWhere.area = area;

  // Also search services — if a service matches, include salons that offer it
  const matchingServices = await db.service.findMany({
    where: {
      status: "active",
      OR: [
        { name: { contains: q, } },
        { category: { contains: q, } },
        { description: { contains: q, } },
      ],
    },
    select: { id: true, name: true, category: true },
  }).catch(() => []);

  const serviceIds = matchingServices.map((s: any) => s.id);

  // Find salons that offer any matching service
  let salonIdsFromServices: string[] = [];
  if (serviceIds.length > 0) {
    const salonServices = await db.salonService.findMany({
      where: {
        serviceId: { in: serviceIds },
        isPublished: true,
        status: "active",
        salon: { isPublished: true, status: "active" },
      },
      select: { salonId: true },
      distinct: ["salonId"],
    }).catch(() => []);
    salonIdsFromServices = salonServices.map((ss: any) => ss.salonId);
  }

  // Combine: salons matching the text query OR salons offering matching services
  const finalSalonWhere = { ...salonWhere };
  if (salonIdsFromServices.length > 0) {
    finalSalonWhere.OR = [
      ...salonWhere.OR,
      { id: { in: salonIdsFromServices } },
    ];
  }

  const [salons, services] = await Promise.all([
    db.salon.findMany({
      where: finalSalonWhere,
      orderBy: { rating: "desc" },
      take: limit ?? 10,
      select: {
        id: true, name: true, tagline: true, category: true, logo: true,
        coverImage: true, rating: true, reviewCount: true, distanceKm: true,
        priceFrom: true, openUntil: true, isOpen: true, verified: true,
        city: true, area: true, amenities: true,
      },
    }).catch(() => []),
    db.service.findMany({
      where: {
        status: "active",
        OR: [
          { name: { contains: q, } },
          { category: { contains: q, } },
        ],
      },
      take: limit ?? 10,
      orderBy: { name: "asc" },
    }).catch(() => []),
  ]);

  return sendSuccess(res, {
    salons,
    services,
    matchedServiceNames: matchingServices.map((s: any) => s.name),
  });
}

/** GET /api/v1/search/areas — list all areas (for filter dropdowns) */
async function listAreas(_req: any, res: any, _next: any) {
  if (!guardDb(res)) return;
  const db = getDb();

  // Get distinct areas from published salons
  const salons = await db.salon.findMany({
    where: { isPublished: true, status: "active", area: { not: null } },
    select: { area: true, city: true },
    distinct: ["area"],
    orderBy: { area: "asc" },
  }).catch((e) => { throw Errors.database("Could not load areas.", e); });

  // Group by city
  const areasByCity: Record<string, string[]> = {};
  for (const s of salons) {
    const city = s.city || "Other";
    if (!areasByCity[city]) areasByCity[city] = [];
    if (s.area && !areasByCity[city].includes(s.area)) {
      areasByCity[city].push(s.area);
    }
  }

  return sendSuccess(res, Object.entries(areasByCity).map(([city, areas]) => ({
    city,
    areas,
  })));
}

/** GET /api/v1/search/suggest — autocomplete suggestions */
async function suggest(req: any, res: any, _next: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const { q, limit } = req.query;

  // Get matching salon names
  const salons = await db.salon.findMany({
    where: {
      isPublished: true,
      status: "active",
      name: { contains: q, },
    },
    select: { name: true },
    take: limit ?? 5,
  }).catch(() => []);

  // Get matching service names
  const services = await db.service.findMany({
    where: {
      status: "active",
      name: { contains: q, },
    },
    select: { name: true, category: true },
    take: limit ?? 5,
  }).catch(() => []);

  // Get matching areas
  const areas = await db.salon.findMany({
    where: {
      isPublished: true,
      status: "active",
      area: { contains: q, },
    },
    select: { area: true },
    distinct: ["area"],
    take: limit ?? 3,
  }).catch(() => []);

  return sendSuccess(res, {
    salons: salons.map((s: any) => s.name),
    services: services.map((s: any) => ({ name: s.name, category: s.category })),
    areas: areas.map((a: any) => a.area).filter(Boolean),
  });
}

// ─── Routes ──────────────────────────────────────────────────────
router.get("/areas", listAreas);
router.get("/suggest", validateQuery(suggestSchema), suggest);
router.get("/salons", validateQuery(searchQuerySchema), searchSalons);
router.get("/services", validateQuery(searchQuerySchema), searchServices);
router.get("/", validateQuery(searchQuerySchema), searchAll);

export default router;
