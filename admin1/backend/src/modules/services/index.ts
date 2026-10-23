/**
 * Services module — master service catalog + salon-specific offerings.
 * ------------------------------------------------------------
 * Endpoints (public — no auth required):
 *   GET  /api/v1/services                → list master services
 *   GET  /api/v1/services/:id            → single service details
 *   GET  /api/v1/services/:id/salons     → salons that offer this service
 *   GET  /api/v1/services/categories      → all categories with counts
 *   GET  /api/v1/services/salon/:salonId → all services of a salon
 *
 * Architecture:
 *   - `Service` (master catalog): global service definitions — name,
 *     category, description, image, defaultDuration, status
 *   - `SalonService` (salon-specific): each salon's pricing, duration,
 *     popularity for a given service
 *
 * A service only appears for a salon if the salon actually offers it
 * (has a SalonService record with status=active + isPublished=true).
 */

import { Router } from "express";
import { z } from "zod";
import { getDb, isDbConfigured } from "../../database";
import { config } from "../../config";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { validateParams, validateQuery, validateBody } from "../../middleware/validate-request";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";

export const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────────
const listQuerySchema = z.object({
  category: z.string().max(80).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid("Invalid service ID format"),
});

const salonIdParamSchema = z.object({
  salonId: z.string().uuid("Invalid salon ID format"),
});

const salonServicesQuerySchema = z.object({
  category: z.string().max(80).optional(),
  price_min: z.coerce.number().int().min(0).optional(),
  price_max: z.coerce.number().int().min(0).optional(),
  duration_max: z.coerce.number().int().min(0).optional(),
  rating_min: z.coerce.number().min(0).max(5).optional(),
  popular: z.enum(["true", "false"]).optional(),
  sort: z.enum(["price_low", "price_high", "rating", "duration", "popular"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

function guardDb(res: any): boolean {
  if (!config.isDatabaseConfigured || !isDbConfigured()) {
    sendError(res, Errors.config("Database is not configured. Set DATABASE_URL in .env"));
    return false;
  }
  return true;
}

// ─── Handlers ────────────────────────────────────────────────────

/** GET /api/v1/services — master catalog list */
async function list(req: any, res: any, _next: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const { category, status, search, limit, offset } = req.query;

  const where: any = {};
  if (category) where.category = category;
  if (status) where.status = status;
  else where.status = "active"; // default to active only

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  const services = await db.service.findMany({
    where,
    orderBy: { name: "asc" },
    take: limit ?? 50,
    skip: offset ?? 0,
  }).catch((e) => { throw Errors.database("Could not load services.", e); });

  return sendSuccess(res, services);
}

/** GET /api/v1/services/:id — single service details */
async function getOne(req: any, res: any, _next: any) {
  if (!guardDb(res)) return;
  const { id } = req.params;
  const db = getDb();

  const service = await db.service.findUnique({
    where: { id },
  }).catch((e) => { throw Errors.database("Could not load the service.", e); });

  if (!service || service.status !== "active") {
    return sendError(res, Errors.notFound("Service not found or no longer available."));
  }

  return sendSuccess(res, service);
}

/** GET /api/v1/services/:id/salons — salons that offer this service */
async function salonsByService(req: any, res: any, _next: any) {
  if (!guardDb(res)) return;
  const { id } = req.params;
  const db = getDb();

  // Find all SalonService records linked to this master service
  // where the salon is published + active
  const salonServices = await db.salonService.findMany({
    where: {
      serviceId: id,
      isPublished: true,
      status: "active",
      salon: {
        isPublished: true,
        status: "active",
      },
    },
    include: {
      salon: {
        select: {
          id: true, name: true, tagline: true, logo: true, coverImage: true,
          rating: true, reviewCount: true, distanceKm: true, city: true,
          area: true, verified: true, isOpen: true, address: true,
        },
      },
    },
    orderBy: { priceFrom: "asc" },
  }).catch((e) => { throw Errors.database("Could not load salons for this service.", e); });

  if (salonServices.length === 0) {
    return sendSuccess(res, [], "No salons currently offer this service.");
  }

  return sendSuccess(res, salonServices.map((ss: any) => ({
    salon: ss.salon,
    serviceOffering: {
      id: ss.id,
      name: ss.name,
      durationMin: ss.durationMin,
      durationLabel: ss.durationLabel,
      priceFrom: ss.priceFrom,
      priceTo: ss.priceTo,
      rating: ss.rating,
      popular: ss.popular,
    },
  })));
}

/** GET /api/v1/services/categories — all categories with counts */
async function categories(_req: any, res: any, _next: any) {
  if (!guardDb(res)) return;
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

/** GET /api/v1/services/salon/:salonId — all services of a salon */
async function listBySalon(req: any, res: any, _next: any) {
  if (!guardDb(res)) return;
  const { salonId } = req.params;
  const { category, price_min, price_max, duration_max, rating_min, popular, sort, limit, offset } = req.query;
  const db = getDb();

  // Verify salon exists
  const salon = await db.salon.findFirst({
    where: { id: salonId, isPublished: true, status: "active" },
    select: { id: true, name: true },
  }).catch((e) => { throw Errors.database("Could not load the salon.", e); });
  if (!salon) {
    return sendError(res, Errors.notFound("Salon not found."));
  }

  const where: any = {
    salonId,
    isPublished: true,
    status: "active",
  };
  if (category) where.category = category;
  if (popular === "true") where.popular = true;
  if (price_min) where.priceFrom = { ...where.priceFrom, gte: price_min };
  if (price_max) where.priceFrom = { ...where.priceFrom, lte: price_max };
  if (duration_max) where.durationMin = { lte: duration_max };
  if (rating_min) where.rating = { gte: rating_min };

  const orderBy: any = (() => {
    switch (sort) {
      case "price_low": return { priceFrom: "asc" as const };
      case "price_high": return { priceFrom: "desc" as const };
      case "rating": return { rating: "desc" as const };
      case "duration": return { durationMin: "asc" as const };
      case "popular": return [{ popular: "desc" as const }, { rating: "desc" as const }];
      default: return [{ popular: "desc" as const }, { priceFrom: "asc" as const }];
    }
  })();

  const services = await db.salonService.findMany({
    where,
    orderBy,
    take: limit ?? 50,
    skip: offset ?? 0,
    include: {
      service: {
        select: { id: true, name: true, description: true, image: true, defaultDuration: true },
      },
    },
  }).catch((e) => { throw Errors.database("Could not load salon services.", e); });

  return sendSuccess(res, services.map((ss: any) => ({
    id: ss.id,
    serviceId: ss.serviceId,
    name: ss.name,
    description: ss.description,
    category: ss.category,
    durationMin: ss.durationMin,
    durationLabel: ss.durationLabel,
    priceFrom: ss.priceFrom,
    priceTo: ss.priceTo,
    rating: ss.rating,
    reviewCount: ss.reviewCount,
    imageUrl: ss.imageUrl,
    whatsIncluded: ss.whatsIncluded,
    popular: ss.popular,
    status: ss.status,
    masterService: ss.service ? {
      id: ss.service.id,
      name: ss.service.name,
      description: ss.service.description,
      image: ss.service.image,
      defaultDuration: ss.service.defaultDuration,
    } : null,
  })));
}

// ─── Routes ──────────────────────────────────────────────────────
// More specific routes must come before /:id
router.get("/categories", categories);
router.get("/salon/:salonId", validateParams(salonIdParamSchema), validateQuery(salonServicesQuerySchema), listBySalon);
router.get("/:id/salons", validateParams(idParamSchema), salonsByService);
router.get("/:id", validateParams(idParamSchema), getOne);

const createSalonServiceSchema = z.object({
  salonId: z.string().uuid(),
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(80),
  price: z.coerce.number().int().min(0),
  duration: z.coerce.number().int().min(5),
  description: z.string().max(1000).optional(),
});

const updateSalonServiceSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  category: z.string().min(1).max(80).optional(),
  price: z.coerce.number().int().min(0).optional(),
  duration: z.coerce.number().int().min(5).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "inactive", "seasonal"]).optional(),
});

async function createSalonService(req: AuthenticatedRequest, res: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const data = req.body;
  const created = await db.salonService.create({
    data: {
      salonId: data.salonId,
      name: data.name,
      category: data.category,
      priceFrom: data.price,
      durationMin: data.duration,
      durationLabel: `${data.duration} min`,
      description: data.description || null,
      status: "active",
      isPublished: true,
    }
  });
  return sendSuccess(res, created, "Service created successfully", 201);
}

async function updateSalonService(req: AuthenticatedRequest, res: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const { id } = req.params;
  const data = req.body;
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.price !== undefined) updateData.priceFrom = data.price;
  if (data.duration !== undefined) {
    updateData.durationMin = data.duration;
    updateData.durationLabel = `${data.duration} min`;
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;

  const updated = await db.salonService.update({
    where: { id },
    data: updateData,
  });
  return sendSuccess(res, updated, "Service updated successfully");
}

async function deleteSalonService(req: AuthenticatedRequest, res: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const { id } = req.params;
  const bookingCount = await db.booking.count({ where: { serviceId: id } });
  if (bookingCount > 0) {
    const updated = await db.salonService.update({
      where: { id },
      data: { status: "inactive", isPublished: false },
    });
    return sendSuccess(res, updated, "Service deactivated because historical bookings exist.");
  }
  await db.salonService.delete({ where: { id } });
  return sendSuccess(res, { id }, "Service deleted successfully");
}
router.get("/", validateQuery(listQuerySchema), list);
router.post("/salon", requireAuth, validateBody(createSalonServiceSchema), createSalonService);
router.patch("/salon/:id", requireAuth, validateParams(idParamSchema), validateBody(updateSalonServiceSchema), updateSalonService);
router.delete("/salon/:id", requireAuth, validateParams(idParamSchema), deleteSalonService);

export default router;

