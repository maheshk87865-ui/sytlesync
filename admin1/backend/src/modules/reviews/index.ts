/**
 * Reviews module — customer reviews + rating calculation.
 * ------------------------------------------------------------
 * Endpoints:
 *   GET    /api/v1/reviews/:salonId              → list salon reviews (public)
 *   GET    /api/v1/reviews/:salonId/rating       → salon rating distribution (public)
 *   POST   /api/v1/reviews                       → create review (auth — requires completed booking)
 *   PATCH  /api/v1/reviews/:reviewId             → edit review (auth — own review only)
 *   DELETE /api/v1/reviews/:reviewId            → delete review (auth — own review only)
 *   GET    /api/v1/reviews/booking/:bookingId    → check if already reviewed (auth)
 *   GET    /api/v1/reviews/me                    → my reviews (auth)
 *
 * Rules:
 *   - Only allow review AFTER a completed eligible booking
 *   - Customer can only review their OWN completed booking
 *   - One review per booking (prevent duplicates)
 *   - Salon rating is COMPUTED from reviews (never hardcoded)
 *   - Rating distribution: count per star (1..5)
 */

import { Router } from "express";
import { z } from "zod";
import { getDb } from "../../database";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { guardDatabase } from "../../middleware/guard-database";
import { validateBody, validateParams } from "../../middleware/validate-request";

export const router = Router();

// ─── Schemas ────────────────────────────────────────────────────
const createSchema = z.object({
  bookingId: z.string().uuid(),
  salonId: z.string().uuid(),
  rating: z.number().int().min(1, "Rating must be at least 1 star").max(5, "Rating must be at most 5 stars"),
  text: z.string().min(1, "Please write a review").max(2000, "Review is too long (max 2000 characters)"),
});

const editSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  text: z.string().min(1).max(2000).optional(),
}).refine((d) => d.rating !== undefined || d.text !== undefined, {
  message: "At least one field (rating or text) must be provided.",
});

const salonIdParam = z.object({ salonId: z.string().uuid() });
const reviewIdParam = z.object({ reviewId: z.string().uuid() });
const bookingIdParam = z.object({ bookingId: z.string().uuid() });

/** Recalculate salon rating from all reviews (called after create/edit/delete) */
async function recalcSalonRating(db: any, salonId: string): Promise<void> {
  const reviews = await db.review.findMany({
    where: { salonId },
    select: { rating: true },
  }).catch(() => []);

  const count = reviews.length;
  if (count === 0) {
    // No reviews — reset to 0
    await db.salonRating.upsert({
      where: { salonId },
      create: { salonId, averageRating: 0, reviewCount: 0 },
      update: { averageRating: 0, reviewCount: 0, rating5: 0, rating4: 0, rating3: 0, rating2: 0, rating1: 0 },
    }).catch(() => {});
    await db.salon.update({
      where: { id: salonId },
      data: { rating: 0, reviewCount: 0 },
    }).catch(() => {});
    return;
  }

  const sum = reviews.reduce((s: number, r: any) => s + r.rating, 0);
  const avg = Math.round((sum / count) * 10) / 10; // 1 decimal place

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    distribution[r.rating as 1|2|3|4|5]++;
  }

  // Upsert the cached rating
  await db.salonRating.upsert({
    where: { salonId },
    create: {
      salonId,
      averageRating: avg,
      reviewCount: count,
      rating1: distribution[1],
      rating2: distribution[2],
      rating3: distribution[3],
      rating4: distribution[4],
      rating5: distribution[5],
    },
    update: {
      averageRating: avg,
      reviewCount: count,
      rating1: distribution[1],
      rating2: distribution[2],
      rating3: distribution[3],
      rating4: distribution[4],
      rating5: distribution[5],
    },
  }).catch(() => {});

  // Also update the salon's denormalized fields
  await db.salon.update({
    where: { id: salonId },
    data: { rating: avg, reviewCount: count },
  }).catch(() => {});
}

// ─── Handlers ────────────────────────────────────────────────────

/** GET /api/v1/reviews/:salonId — list salon reviews (public) */
async function listBySalon(req: any, res: any, _next: any) {
  const db = getDb();
  const { salonId } = req.params;

  const reviews = await db.review.findMany({
    where: { salonId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, rating: true, text: true, reply: true,
      customerName: true, serviceName: true, staffName: true,
      editedAt: true, createdAt: true,
    },
  }).catch((e) => { throw Errors.database("Could not load reviews.", e); });

  // Also return the computed rating summary
  const rating = await db.salonRating.findUnique({
    where: { salonId },
  }).catch(() => null);

  return sendSuccess(res, {
    reviews,
    ratingSummary: rating ? {
      averageRating: rating.averageRating,
      reviewCount: rating.reviewCount,
      distribution: {
        5: rating.rating5, 4: rating.rating4, 3: rating.rating3,
        2: rating.rating2, 1: rating.rating1,
      },
    } : { averageRating: 0, reviewCount: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
  });
}

/** GET /api/v1/reviews/:salonId/rating — just the rating distribution (public) */
async function getRating(req: any, res: any, _next: any) {
  const db = getDb();
  const { salonId } = req.params;

  const rating = await db.salonRating.findUnique({
    where: { salonId },
  }).catch(() => null);

  if (!rating) {
    return sendSuccess(res, {
      averageRating: 0, reviewCount: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    });
  }

  return sendSuccess(res, {
    averageRating: rating.averageRating,
    reviewCount: rating.reviewCount,
    distribution: {
      5: rating.rating5, 4: rating.rating4, 3: rating.rating3,
      2: rating.rating2, 1: rating.rating1,
    },
  });
}

/** POST /api/v1/reviews — create review (auth — requires completed booking) */
async function create(req: AuthenticatedRequest, res: any, _next: any) {
  const db = getDb();
  const { bookingId, salonId, rating, text } = req.body;

  // ─── 1. Find the booking — must belong to this customer ──────
  const booking = await db.booking.findFirst({
    where: { id: bookingId, customerId: req.customerId! },
    select: {
      id: true, salonId: true, status: true, serviceName: true,
      staffName: true, serviceId: true, staffId: true,
    },
  }).catch(() => null);

  if (!booking) {
    return sendError(res, Errors.notFound("Booking not found in your history."));
  }

  // ─── 2. Verify booking is COMPLETED (eligible for review) ────
  if (booking.status !== "COMPLETED") {
    return sendError(res, Errors.validation("You can only review completed bookings. This booking is " + booking.status + "."));
  }

  // ─── 3. Verify salonId matches the booking's salon ──────────
  if (booking.salonId !== salonId) {
    return sendError(res, Errors.validation("The salon ID does not match the booking's salon."));
  }

  // ─── 4. Prevent duplicate reviews (one review per booking) ──
  const existing = await db.review.findUnique({
    where: { bookingId },
  }).catch(() => null);
  if (existing) {
    return sendError(res, Errors.conflict("You have already reviewed this booking. Use PATCH to edit your review."));
  }

  // ─── 5. Get customer name ─────────────────────────────────────
  const customer = await db.customer.findUnique({
    where: { id: req.customerId! },
    select: { name: true },
  }).catch(() => null);
  if (!customer) {
    return sendError(res, Errors.notFound("Account not found."));
  }

  // ─── 6. Create the review + recalculate salon rating ─────────
  const review = await db.$transaction(async (tx) => {
    const newReview = await tx.review.create({
      data: {
        customerId: req.customerId!,
        customerName: customer.name,
        salonId,
        bookingId,
        serviceId: booking.serviceId || null,
        staffId: booking.staffId || null,
        serviceName: booking.serviceName,
        staffName: booking.staffName,
        rating,
        text,
      },
    });
    return newReview;
  }).catch((e: any) => {
    if (e?.code === "P2002") {
      throw Errors.conflict("You have already reviewed this booking.");
    }
    throw Errors.database("Could not post your review.", e);
  });

  // Recalculate salon rating (outside transaction — best-effort)
  await recalcSalonRating(db, salonId).catch(() => {});

  return sendSuccess(res, review, "Review posted", 201);
}

/** PATCH /api/v1/reviews/:reviewId — edit review (own review only) */
async function edit(req: AuthenticatedRequest, res: any, _next: any) {
  const db = getDb();
  const { reviewId } = req.params;
  const { rating, text } = req.body;

  const existing = await db.review.findUnique({
    where: { id: reviewId },
    select: { id: true, customerId: true, salonId: true },
  }).catch(() => null);

  if (!existing) {
    return sendError(res, Errors.notFound("Review not found."));
  }

  // Only the review's owner can edit it
  if (existing.customerId !== req.customerId) {
    return sendError(res, Errors.permission("You can only edit your own reviews."));
  }

  const updated = await db.review.update({
    where: { id: reviewId },
    data: {
      ...(rating !== undefined ? { rating } : {}),
      ...(text !== undefined ? { text } : {}),
      editedAt: new Date(),
      updatedAt: new Date(),
    },
  }).catch((e) => { throw Errors.database("Could not update your review.", e); });

  // Recalculate salon rating
  await recalcSalonRating(db, existing.salonId).catch(() => {});

  return sendSuccess(res, updated, "Review updated");
}

/** DELETE /api/v1/reviews/:reviewId — delete review (own review only) */
async function remove(req: AuthenticatedRequest, res: any, _next: any) {
  const db = getDb();
  const { reviewId } = req.params;

  const existing = await db.review.findUnique({
    where: { id: reviewId },
    select: { id: true, customerId: true, salonId: true },
  }).catch(() => null);

  if (!existing) {
    return sendError(res, Errors.notFound("Review not found."));
  }

  if (existing.customerId !== req.customerId) {
    return sendError(res, Errors.permission("You can only delete your own reviews."));
  }

  await db.review.delete({
    where: { id: reviewId },
  }).catch((e) => { throw Errors.database("Could not delete your review.", e); });

  // Recalculate salon rating
  await recalcSalonRating(db, existing.salonId).catch(() => {});

  return sendSuccess(res, { id: reviewId }, "Review deleted");
}

/** GET /api/v1/reviews/booking/:bookingId — check if already reviewed */
async function checkReviewed(req: AuthenticatedRequest, res: any, _next: any) {
  const db = getDb();
  const { bookingId } = req.params;

  // Verify the booking belongs to this customer
  const booking = await db.booking.findFirst({
    where: { id: bookingId, customerId: req.customerId! },
    select: { id: true, status: true },
  }).catch(() => null);

  if (!booking) {
    return sendError(res, Errors.notFound("Booking not found in your history."));
  }

  const review = await db.review.findUnique({
    where: { bookingId },
    select: { id: true, rating: true, text: true, createdAt: true, editedAt: true },
  }).catch(() => null);

  return sendSuccess(res, {
    alreadyReviewed: !!review,
    canReview: booking.status === "COMPLETED" && !review,
    review,
  });
}

/** GET /api/v1/reviews/me — my reviews */
async function myReviews(req: AuthenticatedRequest, res: any, _next: any) {
  const db = getDb();

  const reviews = await db.review.findMany({
    where: { customerId: req.customerId! },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, rating: true, text: true, reply: true,
      salonId: true, serviceName: true, staffName: true,
      customerName: true, editedAt: true, createdAt: true,
    },
  }).catch((e) => { throw Errors.database("Could not load your reviews.", e); });

  return sendSuccess(res, reviews);
}

// ─── Routes (more specific paths first) ──────────────────────────
router.get("/me", requireAuth, guardDatabase, myReviews);
router.get("/booking/:bookingId", requireAuth, guardDatabase, validateParams(bookingIdParam), checkReviewed);
router.get("/:salonId/rating", guardDatabase, validateParams(salonIdParam), getRating);
router.get("/:salonId", guardDatabase, validateParams(salonIdParam), listBySalon);
router.post("/", requireAuth, guardDatabase, validateBody(createSchema), create);
router.patch("/:reviewId", requireAuth, guardDatabase, validateParams(reviewIdParam), validateBody(editSchema), edit);
router.delete("/:reviewId", requireAuth, guardDatabase, validateParams(reviewIdParam), remove);

export default router;
