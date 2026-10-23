/**
 * Salons module — customer-side salon discovery.
 * ------------------------------------------------------------
 * Endpoints (public — no auth required):
 *   GET  /api/v1/salons              → list with filters
 *   GET  /api/v1/salons/:id          → full salon detail (services, staff, amenities, opening hours)
 *   GET  /api/v1/salons/featured     → verified + top-rated for Home page
 *   GET  /api/v1/salons/:id/services → all services offered by this salon
 *   GET  /api/v1/salons/:id/staff    → staff members of a salon
 *
 * Filters supported on list:
 *   city, area, category, service (name), price_min, price_max,
 *   rating_min, distance (nearby_km), availability (today), search,
 *   sort (distance | rating | price_low | price_high | popularity | availability)
 *
 * Security: only returns isPublished=true + status=active salons.
 * Never exposes internal/private data — only what customers need for
 * discovery, comparison, and booking.
 */

import { Router } from "express";
import { z } from "zod";
import { getDb, isDbConfigured } from "../../database";
import { config } from "../../config";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { validateParams, validateQuery } from "../../middleware/validate-request";
import { optionalAuth, type AuthenticatedRequest } from "../../middleware/auth";

export const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────────
const listQuerySchema = z.object({
  city: z.string().max(120).optional(),
  area: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
  service: z.string().max(120).optional(),
  price_min: z.coerce.number().int().min(0).optional(),
  price_max: z.coerce.number().int().min(0).optional(),
  rating_min: z.coerce.number().min(0).max(5).optional(),
  nearby_km: z.coerce.number().min(0).max(100).optional(),
  // Geo-coordinates for server-side distance calculation
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0.1).max(100).optional(),  // km radius from lat/lng
  availability: z.enum(["today", "open_now"]).optional(),
  verified: z.enum(["true", "false"]).optional(),
  search: z.string().max(200).optional(),
  sort: z.enum(["distance", "rating", "price_low", "price_high", "popularity", "availability"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid("Invalid salon ID format"),
});

// ─── Helpers ────────────────────────────────────────────────────
/** Safe DB access — returns clean config error if DB isn't reachable */
function guardDb(res: any): boolean {
  if (!config.isDatabaseConfigured || !isDbConfigured()) {
    sendError(res, Errors.config("Database is not configured. Set DATABASE_URL in .env"));
    return false;
  }
  return true;
}

/** Response shape for a salon list item (summary — not full detail) */
function salonSummary(s: any) {
  return {
    id: s.id,
    name: s.name,
    tagline: s.tagline,
    category: s.category,
    logo: s.logo,
    coverImage: s.coverImage,
    rating: s.rating,
    reviewCount: s.reviewCount,
    distanceKm: s.distanceKm,
    priceFrom: s.priceFrom,
    isOpen: s.isOpen,
    openUntil: s.openUntil,
    status: s.status,
    verified: s.verified,
    city: s.city,
    area: s.area,
    amenities: s.amenities,
  };
}

/** Response shape for full salon detail (includes services, staff, etc.) */
function salonDetail(s: any) {
  return {
    id: s.id,
    name: s.name,
    tagline: s.tagline,
    description: s.description,
    category: s.category,
    logo: s.logo,
    coverImage: s.coverImage,
    gallery: s.gallery,
    rating: s.rating,
    reviewCount: s.reviewCount,
    distanceKm: s.distanceKm,
    priceFrom: s.priceFrom,
    openUntil: s.openUntil,
    isOpen: s.isOpen,
    status: s.status,
    openingHours: s.openingHours,
    amenities: s.amenities,
    address: s.address,
    area: s.area,
    city: s.city,
    latitude: s.latitude,
    longitude: s.longitude,
    cancellationPolicy: s.cancellationPolicy,
    verified: s.verified,
    // Nested relations (included by the query)
    services: (s.services || []).map((ss: any) => ({
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
    })),
    staff: (s.staff || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      rating: m.rating,
      reviewCount: m.reviewCount,
      avatarColor: m.avatarColor,
      initials: m.initials,
      yearsExperience: m.yearsExperience,
      bio: m.bio,
      specializations: m.specializations,
    })),
  };
}

// ─── Handlers ────────────────────────────────────────────────────

/** GET /api/v1/salons — list with filters */
async function list(req: AuthenticatedRequest, res: any, _next: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const q = req.query as any;

  // Build the where clause — only published + active salons
  const where: any = {
    isPublished: true,
    status: "active",
  };

  if (q.city) where.city = q.city;
  if (q.area) where.area = q.area;
  if (q.category) where.category = q.category;
  if (q.verified === "true") where.verified = true;
  if (q.rating_min) where.rating = { gte: q.rating_min };
  if (q.price_min || q.price_max) {
    where.priceFrom = {
      ...(q.price_min ? { gte: q.price_min } : {}),
      ...(q.price_max ? { lte: q.price_max } : {}),
    };
  }
  if (q.availability === "open_now") where.isOpen = true;

  // Search across salon name, tagline, description, area
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: "insensitive" } },
      { tagline: { contains: q.search, mode: "insensitive" } },
      { description: { contains: q.search, mode: "insensitive" } },
      { area: { contains: q.search, mode: "insensitive" } },
      { city: { contains: q.search, mode: "insensitive" } },
    ];
  }

  // Filter by service name — only return salons that offer this service
  if (q.service) {
    where.services = {
      some: {
        name: { contains: q.service, mode: "insensitive" },
        isPublished: true,
        status: "active",
      },
    };
  }

  // Sort
  const orderBy: any = (() => {
    switch (q.sort) {
      case "rating": return { rating: "desc" as const };
      case "price_low": return { priceFrom: "asc" as const };
      case "price_high": return { priceFrom: "desc" as const };
      case "popularity": return { reviewCount: "desc" as const };
      case "availability": return [{ isOpen: "desc" as const }, { rating: "desc" as const }];
      case "distance":
      default: return { distanceKm: "asc" as const };
    }
  })();

  const salons = await db.salon.findMany({
    where,
    orderBy: (q.lat && q.lng) ? undefined : orderBy,  // if geo-sorting, sort after distance calc
    take: q.lat && q.lng ? undefined : (q.limit ?? 20),  // if geo, fetch all then filter
    skip: q.lat && q.lng ? undefined : (q.offset ?? 0),
    select: {
      id: true, name: true, tagline: true, category: true, logo: true,
      coverImage: true, rating: true, reviewCount: true, distanceKm: true,
      priceFrom: true, openUntil: true, isOpen: true, status: true,
      verified: true, city: true, area: true, amenities: true,
      latitude: true, longitude: true,
    },
  }).catch((e) => { throw Errors.database("Could not load salons.", e); });

  let result = salons;

  // ─── Server-side distance calculation using Haversine ────
  // The frontend sends lat/lng; the backend computes distance.
  // The frontend NEVER sends a distance value.
  if (q.lat && q.lng) {
    const { haversineDistance } = await import("../../services/geo-utils");
    result = salons
      .filter((s: any) => s.latitude !== null && s.longitude !== null)
      .map((s: any) => ({
        ...s,
        distanceKm: haversineDistance(q.lat, q.lng, s.latitude, s.longitude),
      }));

    // Filter by radius if provided
    if (q.radius) {
      result = result.filter((s: any) => s.distanceKm <= q.radius);
    }

    // Sort by distance if geo-search is active
    if (!q.sort || q.sort === "distance") {
      result.sort((a: any, b: any) => a.distanceKm - b.distanceKm);
    } else {
      // Apply requested sort
      const sortFn = (() => {
        switch (q.sort) {
          case "rating": return (a: any, b: any) => b.rating - a.rating;
          case "price_low": return (a: any, b: any) => a.priceFrom - b.priceFrom;
          case "price_high": return (a: any, b: any) => b.priceFrom - a.priceFrom;
          case "popularity": return (a: any, b: any) => b.reviewCount - a.reviewCount;
          default: return (a: any, b: any) => a.distanceKm - b.distanceKm;
        }
      })();
      result.sort(sortFn);
    }

    // Pagination after geo-filtering
    result = result.slice(q.offset ?? 0, (q.offset ?? 0) + (q.limit ?? 20));
  }

  // Filter by nearby_km (legacy — uses the DB's pre-computed distanceKm)
  if (q.nearby_km !== undefined && !(q.lat && q.lng)) {
    result = salons.filter((s: any) => s.distanceKm <= q.nearby_km);
  }

  // Filter by availability today — check if the salon has any open slots today
  if (q.availability === "today" && result.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const salonIds = result.map((s: any) => s.id);
    const slotsToday = await db.availabilitySlot.findMany({
      where: {
        salonId: { in: salonIds },
        date: today,
        status: { in: ["open", "limited"] },
      },
      select: { salonId: true },
      distinct: ["salonId"],
    }).catch(() => []);
    const salonsWithSlots = new Set(slotsToday.map((s: any) => s.salonId));
    result = result.filter((s: any) => salonsWithSlots.has(s.id));
  }

  return sendSuccess(res, result.map(salonSummary));
}

/** GET /api/v1/salons/:id — full salon detail */
async function getOne(req: AuthenticatedRequest, res: any, _next: any) {
  if (!guardDb(res)) return;
  const { id } = req.params as any;
  const db = getDb();

  const salon = await db.salon.findFirst({
    where: { id, isPublished: true, status: "active" },
    include: {
      services: {
        where: { isPublished: true, status: "active" },
        orderBy: { popular: "desc" },
      },
      staff: {
        where: { isPublished: true },
        orderBy: { rating: "desc" },
      },
    },
  }).catch((e) => { throw Errors.database("Could not load the salon.", e); });

  if (!salon) {
    return sendError(res, Errors.notFound("Salon not found or no longer available."));
  }

  return sendSuccess(res, salonDetail(salon));
}

/** GET /api/v1/salons/featured — verified + top-rated for Home */
async function featured(req: AuthenticatedRequest, res: any, _next: any) {
  if (!guardDb(res)) return;
  const db = getDb();

  const salons = await db.salon.findMany({
    where: { isPublished: true, status: "active", verified: true },
    orderBy: [{ rating: "desc" }, { distanceKm: "asc" }],
    take: 8,
    select: {
      id: true, name: true, tagline: true, category: true, logo: true,
      coverImage: true, rating: true, reviewCount: true, distanceKm: true,
      priceFrom: true, openUntil: true, isOpen: true, status: true,
      verified: true, city: true, area: true, amenities: true,
    },
  }).catch((e) => { throw Errors.database("Could not load featured salons.", e); });

  return sendSuccess(res, salons.map(salonSummary));
}

/** GET /api/v1/salons/:id/services — all services offered by a salon */
async function services(req: AuthenticatedRequest, res: any, _next: any) {
  if (!guardDb(res)) return;
  const { id } = req.params as any;
  const db = getDb();

  // Verify the salon exists + is published
  const salon = await db.salon.findFirst({
    where: { id, isPublished: true, status: "active" },
    select: { id: true },
  }).catch((e) => { throw Errors.database("Could not load the salon.", e); });
  if (!salon) {
    return sendError(res, Errors.notFound("Salon not found."));
  }

  const salonServices = await db.salonService.findMany({
    where: { salonId: id, isPublished: true, status: "active" },
    orderBy: [{ popular: "desc" }, { priceFrom: "asc" }],
    include: {
      service: {
        select: { id: true, name: true, category: true, description: true, image: true, defaultDuration: true },
      },
    },
  }).catch((e) => { throw Errors.database("Could not load services.", e); });

  return sendSuccess(res, salonServices.map((ss: any) => ({
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
    // Master service info (if linked)
    masterService: ss.service ? {
      id: ss.service.id,
      name: ss.service.name,
      category: ss.service.category,
      description: ss.service.description,
      image: ss.service.image,
      defaultDuration: ss.service.defaultDuration,
    } : null,
  })));
}

/** GET /api/v1/salons/:id/staff — staff members */
async function staff(req: AuthenticatedRequest, res: any, _next: any) {
  if (!guardDb(res)) return;
  const { id } = req.params as any;
  const db = getDb();

  const salon = await db.salon.findFirst({
    where: { id, isPublished: true, status: "active" },
    select: { id: true },
  }).catch((e) => { throw Errors.database("Could not load the salon.", e); });
  if (!salon) {
    return sendError(res, Errors.notFound("Salon not found."));
  }

  const staffMembers = await db.staffMember.findMany({
    where: { salonId: id, isPublished: true },
    orderBy: { rating: "desc" },
    select: {
      id: true, name: true, role: true, rating: true, reviewCount: true,
      avatarColor: true, initials: true, yearsExperience: true,
      bio: true, specializations: true, serviceIds: true,
    },
  }).catch((e) => { throw Errors.database("Could not load staff.", e); });

  return sendSuccess(res, staffMembers);
}

// ─── Routes ──────────────────────────────────────────────────────
// More specific routes must come before /:id to avoid shadowing
router.get("/featured", optionalAuth, featured);
router.get("/", optionalAuth, validateQuery(listQuerySchema), list);
router.get("/:id/services", optionalAuth, validateParams(idParamSchema), services);
router.get("/:id/staff", optionalAuth, validateParams(idParamSchema), staff);

async function updateStatus(req: AuthenticatedRequest, res: any) {
  if (!guardDb(res)) return;
  const { id } = req.params as any;
  const { status, isOpen } = req.body;
  const db = getDb();

  const updateData: any = {};
  if (status !== undefined) updateData.status = status;
  if (isOpen !== undefined) updateData.isOpen = isOpen;

  const updated = await db.salon.update({
    where: { id },
    data: updateData,
  });

  return sendSuccess(res, updated, "Salon status updated successfully");
}

router.get("/:id", optionalAuth, validateParams(idParamSchema), getOne);
router.patch("/:id/status", updateStatus);

export default router;
