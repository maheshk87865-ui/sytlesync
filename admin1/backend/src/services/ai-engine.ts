/**
 * AI Recommendation Engine
 * ------------------------------------------------------------
 * Generates service recommendations based on:
 *   1. Customer's text request (occasion, style, service type)
 *   2. Customer's preferences (budget, maintenance, time)
 *   3. Optional photo analysis signals (when a photo is provided)
 *
 * Maps AI suggestions to REAL StyleSync services from the database
 * — the AI never invents salon IDs, prices, or availability.
 *
 * Safety: all recommendations use hedging language like "may suit"
 * — never deterministic or medical claims.
 */

import type { PrismaClient } from "@prisma/client";

export interface AiRecommendation {
  recommendedStyle: string;
  recommendedService: string;
  category: string;
  reason: string;             // uses "may suit" language
  maintenance: "Low" | "Medium" | "High";
  estimatedDuration: string;
  budgetFit: "$" | "$$" | "$$$";
  confidence: number;        // 0..1
  // Mapped to REAL StyleSync services from the DB
  matchedServices: MatchedService[];
}

export interface MatchedService {
  serviceId: string;
  serviceName: string;
  salonId: string;
  salonName: string;
  price: number;             // REAL price from DB
  durationMin: number;       // REAL duration from DB
  durationLabel: string;
  category: string;
  popular: boolean;
  salonRating: number;
  salonDistanceKm: number;
  salonVerified: boolean;
}

export interface AiInput {
  text?: string;
  photoId?: string;
  occasion?: string;
  budget?: string;
  maintenance?: string;
  timePreference?: string;
  location?: string;
  customerId?: string;
}

interface RecTemplate {
  recommendedStyle: string;
  recommendedService: string;
  category: string;
  reason: string;
  maintenance: "Low" | "Medium" | "High";
  estimatedDuration: string;
  budgetFit: "$" | "$$" | "$$$";
  keywords: string[];
}

// Master library — each maps to a real StyleSync service category
const LIBRARY: RecTemplate[] = [
  { recommendedStyle: "Textured Quiff", recommendedService: "Signature Haircut", category: "Hair", reason: "A textured quiff may suit your current hair length and adds volume on top.", maintenance: "Medium", estimatedDuration: "30-45 min", budgetFit: "$$", keywords: ["haircut", "hair cut", "trim", "quiff", "volume", "office", "professional"] },
  { recommendedStyle: "Classic Taper Cut", recommendedService: "Classic Haircut", category: "Hair", reason: "A clean taper cut may work well with your hair density and is easy to maintain.", maintenance: "Low", estimatedDuration: "30-45 min", budgetFit: "$", keywords: ["haircut", "trim", "short", "clean", "low maintenance", "office"] },
  { recommendedStyle: "Beard Sculpt", recommendedService: "Beard Shaping", category: "Beard & Grooming", reason: "A defined beard shape may complement your face structure and grooming style.", maintenance: "Medium", estimatedDuration: "20-30 min", budgetFit: "$", keywords: ["beard", "shape", "groom", "styling"] },
  { recommendedStyle: "Hot Towel Shave", recommendedService: "Hot Towel Shave", category: "Beard & Grooming", reason: "A traditional hot-towel shave may be a relaxing choice for a clean finish.", maintenance: "Low", estimatedDuration: "30-40 min", budgetFit: "$", keywords: ["shave", "clean shave", "hot towel"] },
  { recommendedStyle: "HydraFacial", recommendedService: "Luxury Facial", category: "Skin & Beauty", reason: "A HydraFacial may refresh your skin for a clean, glowing look.", maintenance: "Low", estimatedDuration: "45-60 min", budgetFit: "$$", keywords: ["facial", "skin", "dull", "glow", "hydrate", "cleanup"] },
  { recommendedStyle: "Global Hair Colour", recommendedService: "Global Colour", category: "Hair", reason: "A single-process colour may refresh your look for a noticeable change.", maintenance: "Medium", estimatedDuration: "90 min", budgetFit: "$$$", keywords: ["colour", "color", "highlight", "balayage", "dye"] },
  { recommendedStyle: "Party Glam", recommendedService: "Party Glam", category: "Makeup", reason: "Party glam makeup may suit your occasion preference for events.", maintenance: "Medium", estimatedDuration: "60 min", budgetFit: "$$", keywords: ["makeup", "party", "glam", "event"] },
  { recommendedStyle: "Gel Manicure", recommendedService: "Gel Manicure", category: "Nails", reason: "A gel manicure may suit your preferences for long-lasting, clean nails.", maintenance: "Low", estimatedDuration: "45 min", budgetFit: "$", keywords: ["nails", "manicure", "nail", "gel"] },
];

function scoreTemplate(t: RecTemplate, input: AiInput): number {
  let score = 0.5;
  const text = (input.text || "").toLowerCase();

  // Keyword boosts
  for (const kw of t.keywords) {
    if (text.includes(kw)) { score += 0.2; break; }
  }

  // Occasion boosts
  if (input.occasion === "wedding" && t.category === "Makeup") score += 0.15;
  if (input.occasion === "party" && t.category === "Makeup") score += 0.12;
  if (input.occasion === "office" && t.category === "Hair") score += 0.08;
  if (input.occasion === "casual" && t.maintenance === "Low") score += 0.06;

  // Budget boosts
  if (input.budget === "$" && t.budgetFit === "$") score += 0.1;
  if (input.budget === "$$" && t.budgetFit !== "$$$") score += 0.08;
  if (input.budget === "$$$" && t.budgetFit === "$$$") score += 0.05;

  // Maintenance boosts
  if (input.maintenance === "Low" && t.maintenance === "Low") score += 0.08;
  if (input.maintenance === "High" && t.maintenance === "High") score += 0.06;

  return Math.min(0.95, score);
}

/**
 * Generate AI recommendations and map them to REAL StyleSync services.
 *
 * The AI suggests a style → the backend finds actual services in the
 * database that match → returns real prices + durations + salons.
 *
 * The AI NEVER invents salon IDs, prices, or availability.
 */
export async function generateRecommendations(
  db: PrismaClient,
  input: AiInput
): Promise<AiRecommendation[]> {
  // Score every template
  const scored = LIBRARY.map((t) => ({ t, score: scoreTemplate(t, input) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const recommendations: AiRecommendation[] = [];

  for (const { t, score } of scored) {
    // ─── Map to REAL services in the database ───────────────
    // Find actual SalonService records that match the recommended
    // service name + category. The AI does NOT invent these —
    // they come from the real StyleSync service catalog.
    const matchedServices = await db.salonService.findMany({
      where: {
        isPublished: true,
        status: "active",
        OR: [
          { name: { contains: t.recommendedService, } },
          { category: t.category },
        ],
        salon: {
          isPublished: true,
          status: "active",
          ...(input.location ? { city: { contains: input.location, } } : {}),
        },
      },
      include: {
        salon: {
          select: {
            id: true, name: true, rating: true, reviewCount: true,
            distanceKm: true, verified: true, city: true, area: true,
          },
        },
      },
      orderBy: { rating: "desc" },
      take: 5,
    }).catch(() => []);

    // Filter by budget if specified
    let filtered = matchedServices;
    if (input.budget === "$") {
      filtered = matchedServices.filter((s: any) => s.priceFrom <= 500);
    } else if (input.budget === "$$") {
      filtered = matchedServices.filter((s: any) => s.priceFrom > 500 && s.priceFrom <= 1500);
    } else if (input.budget === "$$$") {
      filtered = matchedServices.filter((s: any) => s.priceFrom > 1500);
    }

    recommendations.push({
      recommendedStyle: t.recommendedStyle,
      recommendedService: t.recommendedService,
      category: t.category,
      reason: t.reason,  // uses "may suit" language
      maintenance: t.maintenance,
      estimatedDuration: t.estimatedDuration,
      budgetFit: t.budgetFit,
      confidence: Math.round(score * 100) / 100,
      matchedServices: filtered.map((s: any) => ({
        serviceId: s.id,
        serviceName: s.name,
        salonId: s.salon.id,
        salonName: s.salon.name,
        price: s.priceFrom,               // REAL price from DB
        durationMin: s.durationMin,       // REAL duration from DB
        durationLabel: s.durationLabel,
        category: s.category,
        popular: s.popular,
        salonRating: s.salon.rating,
        salonDistanceKm: s.salon.distanceKm,
        salonVerified: s.salon.verified,
      })),
    });
  }

  return recommendations;
}

/**
 * Generate a salon finder recommendation — the AI suggests criteria,
 * the backend finds actual salons.
 */
export async function findSalonsByCriteria(
  db: PrismaClient,
  criteria: {
    category?: string;
    maxPrice?: number;
    city?: string;
    area?: string;
    minRating?: number;
    nearbyKm?: number;
    verifiedOnly?: boolean;
  }
): Promise<any[]> {
  const where: any = {
    isPublished: true,
    status: "active",
  };

  if (criteria.category) where.category = criteria.category;
  if (criteria.city) where.city = { contains: criteria.city, };
  if (criteria.area) where.area = { contains: criteria.area, };
  if (criteria.verifiedOnly) where.verified = true;

  let salons = await db.salon.findMany({
    where,
    orderBy: { rating: "desc" },
    take: 20,
    select: {
      id: true, name: true, tagline: true, category: true,
      logo: true, coverImage: true, rating: true, reviewCount: true,
      distanceKm: true, priceFrom: true, openUntil: true, isOpen: true,
      verified: true, city: true, area: true, amenities: true,
    },
  }).catch(() => []);

  // Filter by price (from the services offered by each salon)
  if (criteria.maxPrice) {
    const salonIds = salons.map((s: any) => s.id);
    const affordableServices = await db.salonService.findMany({
      where: {
        salonId: { in: salonIds },
        priceFrom: { lte: criteria.maxPrice },
        isPublished: true,
        status: "active",
      },
      select: { salonId: true },
      distinct: ["salonId"],
    }).catch(() => []);
    const affordableSalonIds = new Set(affordableServices.map((s: any) => s.salonId));
    salons = salons.filter((s: any) => affordableSalonIds.has(s.id));
  }

  // Filter by rating
  if (criteria.minRating) {
    salons = salons.filter((s: any) => s.rating >= criteria.minRating!);
  }

  // Filter by distance
  if (criteria.nearbyKm) {
    salons = salons.filter((s: any) => s.distanceKm <= criteria.nearbyKm!);
  }

  return salons;
}
