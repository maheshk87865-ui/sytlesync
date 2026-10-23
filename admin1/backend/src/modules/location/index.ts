/**
 * Location module — location-based salon discovery.
 * ------------------------------------------------------------
 * Endpoints (public — no auth required):
 *   GET  /api/v1/locations/cities          → all cities with salon counts
 *   GET  /api/v1/locations/areas           → areas within a city
 *   GET  /api/v1/locations/nearby          → salons near a coordinate (lat/lng/radius)
 *   POST /api/v1/locations/search           → advanced geo-filtered search
 *
 * Architecture:
 *   - The system supports MULTIPLE cities (not hardcoded to Srinagar)
 *   - Distance is ALWAYS calculated server-side using Haversine formula
 *   - The frontend sends coordinates; the backend computes distance
 *   - The frontend NEVER sends a distance value
 *   - Only public discovery data is returned (no private/internal info)
 */

import { Router } from "express";
import { z } from "zod";
import { getDb, isDbConfigured } from "../../database";
import { config } from "../../config";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { validateQuery, validateBody } from "../../middleware/validate-request";
import {
  haversineDistance, distanceToSalon, filterByRadius,
  validateCoordinates, formatLocation,
  type Coordinates,
} from "../../services/geo-utils";

export const router = Router();

// ─── Schemas ────────────────────────────────────────────────────
const nearbyQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(100).default(5), // km, default 5km
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const citiesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const areasQuery = z.object({
  city: z.string().min(1).max(120),
});

const advancedSearchSchema = z.object({
  // Location
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0.1).max(100).optional(),
  city: z.string().max(120).optional(),
  area: z.string().max(120).optional(),
  // Search
  search: z.string().max(200).optional(),
  // Filters
  category: z.string().max(80).optional(),
  service: z.string().max(120).optional(),
  price_min: z.number().int().min(0).optional(),
  price_max: z.number().int().min(0).optional(),
  rating_min: z.coerce.number().min(0).max(5).optional(),
  verified: z.boolean().optional(),
  availability: z.enum(["open_now", "today"]).optional(),
  // Sort
  sort: z.enum(["distance", "rating", "price_low", "price_high", "popularity"]).optional(),
  // Pagination
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
}).refine(
  (d) => d.latitude !== undefined || d.city !== undefined || d.area !== undefined,
  { message: "At least one of: latitude, city, or area must be provided." }
);

function guardDb(res: any): boolean {
  if (!config.isDatabaseConfigured || !isDbConfigured()) {
    sendError(res, Errors.config("Database is not configured."));
    return false;
  }
  return true;
}

// ─── Handlers ────────────────────────────────────────────────────

/** GET /api/v1/locations/cities — all cities with salon counts */
async function listCities(req: any, res: any, _next: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const { limit } = req.query;

  // Group salons by city, count them
  const salons = await db.salon.findMany({
    where: { isPublished: true, status: "active", city: { not: null } },
    select: { city: true, area: true, latitude: true, longitude: true },
  }).catch((e) => { throw Errors.database("Could not load cities.", e); });

  const cityMap = new Map<string, { city: string; salonCount: number; areas: string[]; hasCoordinates: boolean }>();
  for (const s of salons) {
    const city = s.city || "Other";
    if (!cityMap.has(city)) {
      cityMap.set(city, { city, salonCount: 0, areas: [], hasCoordinates: false });
    }
    const entry = cityMap.get(city)!;
    entry.salonCount++;
    if (s.area && !entry.areas.includes(s.area)) entry.areas.push(s.area);
    if (s.latitude !== null && s.longitude !== null) entry.hasCoordinates = true;
  }

  const cities = Array.from(cityMap.values())
    .sort((a, b) => b.salonCount - a.salonCount)
    .slice(0, limit ?? 50);

  return sendSuccess(res, cities);
}

/** GET /api/v1/locations/areas?city=Srinagar — areas within a city */
async function listAreas(req: any, res: any, _next: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const { city } = req.query;

  const salons = await db.salon.findMany({
    where: {
      isPublished: true, status: "active",
      city: { equals: city, },
      area: { not: null },
    },
    select: {
      area: true, latitude: true, longitude: true,
      name: true, rating: true, distanceKm: true, priceFrom: true,
    },
    orderBy: { area: "asc" },
  }).catch((e) => { throw Errors.database("Could not load areas.", e); });

  // Group by area
  const areaMap = new Map<string, { area: string; salonCount: number; avgRating: number; minPrice: number; hasCoordinates: boolean }>();
  for (const s of salons) {
    const area = s.area || "Other";
    if (!areaMap.has(area)) {
      areaMap.set(area, { area, salonCount: 0, avgRating: 0, minPrice: Infinity, hasCoordinates: false });
    }
    const entry = areaMap.get(area)!;
    entry.salonCount++;
    entry.avgRating = (entry.avgRating * (entry.salonCount - 1) + s.rating) / entry.salonCount;
    entry.minPrice = Math.min(entry.minPrice, s.priceFrom);
    if (s.latitude !== null && s.longitude !== null) entry.hasCoordinates = true;
  }

  return sendSuccess(res, Array.from(areaMap.values())
    .map((a) => ({ ...a, avgRating: Math.round(a.avgRating * 10) / 10, minPrice: a.minPrice === Infinity ? 0 : a.minPrice }))
    .sort((a, b) => a.area.localeCompare(b.area)));
}

/** GET /api/v1/locations/nearby?lat=X&lng=Y&radius=5 — salons within radius */
async function nearbySalons(req: any, res: any, _next: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const { lat, lng, radius, limit } = req.query;
  const customerCoords: Coordinates = { latitude: lat, longitude: lng };

  // Get all salons with coordinates (we filter by distance after)
  const salons = await db.salon.findMany({
    where: {
      isPublished: true, status: "active",
      latitude: { not: null }, longitude: { not: null },
    },
    select: {
      id: true, name: true, tagline: true, category: true,
      logo: true, coverImage: true, rating: true, reviewCount: true,
      distanceKm: true, priceFrom: true, openUntil: true, isOpen: true,
      status: true, verified: true, city: true, area: true,
      amenities: true, latitude: true, longitude: true, address: true,
    },
  }).catch((e) => { throw Errors.database("Could not load nearby salons.", e); });

  // Calculate real distance server-side (Haversine)
  const withDistance = salons
    .map((s: any) => ({
      ...s,
      distanceKm: haversineDistance(lat, lng, s.latitude, s.longitude),
      location: formatLocation(s),
    }))
    .filter((s: any) => s.distanceKm <= radius)
    .sort((a: any, b: any) => a.distanceKm - b.distanceKm)
    .slice(0, limit);

  return sendSuccess(res, {
    center: { latitude: lat, longitude: lng },
    radiusKm: radius,
    totalFound: withDistance.length,
    salons: withDistance,
  });
}

/** POST /api/v1/locations/search — advanced geo-filtered search */
async function advancedSearch(req: any, res: any, _next: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const q = req.body;

  // Build the where clause
  const where: any = { isPublished: true, status: "active" };

  if (q.city) where.city = { contains: q.city, };
  if (q.area) where.area = { contains: q.area, };
  if (q.category) where.category = q.category;
  if (q.verified) where.verified = true;
  if (q.rating_min) where.rating = { gte: q.rating_min };
  if (q.price_min || q.price_max) {
    where.priceFrom = {
      ...(q.price_min ? { gte: q.price_min } : {}),
      ...(q.price_max ? { lte: q.price_max } : {}),
    };
  }
  if (q.availability === "open_now") where.isOpen = true;

  // Text search across salon name, tagline, area, city
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, } },
      { tagline: { contains: q.search, } },
      { description: { contains: q.search, } },
      { area: { contains: q.search, } },
      { city: { contains: q.search, } },
    ];
  }

  // Filter by service name
  if (q.service) {
    where.services = {
      some: {
        name: { contains: q.service, },
        isPublished: true, status: "active",
      },
    };
  }

  // If lat/lng is provided, we need coordinates
  if (q.latitude && q.longitude) {
    where.latitude = { not: null };
    where.longitude = { not: null };
  }

  const salons = await db.salon.findMany({
    where,
    select: {
      id: true, name: true, tagline: true, category: true,
      logo: true, coverImage: true, rating: true, reviewCount: true,
      distanceKm: true, priceFrom: true, openUntil: true, isOpen: true,
      status: true, verified: true, city: true, area: true,
      amenities: true, latitude: true, longitude: true, address: true,
    },
  }).catch((e) => { throw Errors.database("Search failed.", e); });

  // If coordinates provided, calculate real distance server-side
  let results = salons;
  if (q.latitude && q.longitude) {
    const customerCoords: Coordinates = { latitude: q.latitude, longitude: q.longitude };

    // Calculate distance + filter by radius
    results = salons
      .map((s: any) => ({
        ...s,
        distanceKm: haversineDistance(q.latitude, q.longitude, s.latitude, s.longitude),
        location: formatLocation(s),
      }));

    if (q.radius) {
      results = results.filter((s: any) => s.distanceKm <= q.radius);
    }
  }

  // Sort
  switch (q.sort) {
    case "rating":
      results.sort((a: any, b: any) => b.rating - a.rating);
      break;
    case "price_low":
      results.sort((a: any, b: any) => a.priceFrom - b.priceFrom);
      break;
    case "price_high":
      results.sort((a: any, b: any) => b.priceFrom - a.priceFrom);
      break;
    case "popularity":
      results.sort((a: any, b: any) => b.reviewCount - a.reviewCount);
      break;
    case "distance":
    default:
      results.sort((a: any, b: any) => (a.distanceKm || 0) - (b.distanceKm || 0));
      break;
  }

  // Pagination
  const total = results.length;
  const paginated = results.slice(q.offset, q.offset + q.limit);

  return sendSuccess(res, {
    total,
    count: paginated.length,
    filters: {
      ...(q.latitude ? { latitude: q.latitude, longitude: q.longitude } : {}),
      ...(q.radius ? { radiusKm: q.radius } : {}),
      ...(q.city ? { city: q.city } : {}),
      ...(q.area ? { area: q.area } : {}),
      ...(q.category ? { category: q.category } : {}),
      ...(q.service ? { service: q.service } : {}),
      ...(q.rating_min ? { ratingMin: q.rating_min } : {}),
      ...(q.price_min ? { priceMin: q.price_min } : {}),
      ...(q.price_max ? { priceMax: q.price_max } : {}),
      ...(q.verified ? { verifiedOnly: true } : {}),
      ...(q.availability ? { availability: q.availability } : {}),
      sort: q.sort || "distance",
    },
    salons: paginated,
  });
}

// ─── Routes ──────────────────────────────────────────────────────
router.get("/cities", validateQuery(citiesQuery), listCities);
router.get("/areas", validateQuery(areasQuery), listAreas);
router.get("/nearby", validateQuery(nearbyQuery), nearbySalons);
router.post("/search", validateBody(advancedSearchSchema), advancedSearch);

export default router;
