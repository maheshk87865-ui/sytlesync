/**
 * Review Service — BACKEND-CONNECTED
 * --------------------------------------------------------------------
 * Calls the StyleSync Express backend at /api/v1/reviews/* for
 * reading + creating customer reviews.
 *
 * The backend enforces:
 *   - 1 review per booking (unique constraint)
 *   - only the booking's owner can review it
 *   - only completed bookings can be reviewed
 *   - salon rating is COMPUTED server-side from real review data
 *
 * The frontend can never create a fake review, never modify another
 * customer's review, and never invent a salon rating.
 */

import { api } from "@/lib/backend/client";
import type { ReviewRecord } from "@/lib/types";

export interface CreateReviewInput {
  customer_id: string;        // ignored by backend (uses JWT customerId)
  customer_name: string;      // ignored by backend (uses DB customer record)
  salon_id: string;
  booking_id: string | null;  // backend requires this — review must reference a real booking
  rating: number;             // 1..5
  text: string;
}

// ─── Backend response shape ────────────────────────────────────
interface BackendReview {
  id: string;
  customer?: { id: string; name: string; };
  customerId?: string;
  customerName?: string;
  salonId?: string;
  bookingId?: string | null;
  rating: number;
  text?: string;
  comment?: string;
  reply?: string | null;
  salonReply?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Get all reviews for a salon (most recent first). */
export async function getReviews(salonId: string): Promise<ReviewRecord[]> {
  const result = await api.get<BackendReview[] | { reviews: BackendReview[] }>(
    `/reviews/${salonId}`,
    { auth: false }
  );
  const reviews = Array.isArray(result) ? result : (result?.reviews || []);
  return reviews.map(mapToReview);
}

/** Get salon rating distribution (count per star). */
export async function getSalonRatingDistribution(salonId: string): Promise<{
  average: number;
  total: number;
  distribution: { stars: number; count: number }[];
}> {
  return await api.get(`/reviews/${salonId}/rating`, { auth: false });
}

/** Create a new review for a completed booking. */
export async function createReview(input: CreateReviewInput): Promise<ReviewRecord> {
  const review = await api.post<BackendReview>("/reviews", {
    bookingId: input.booking_id,
    salonId: input.salon_id,
    rating: input.rating,
    text: input.text,
  });
  return mapToReview(review);
}

/** Check if the customer has already reviewed a booking (1 review per booking). */
export async function hasReviewedBooking(_customer_id: string, booking_id: string): Promise<boolean> {
  try {
    const result = await api.get<{ hasReviewed: boolean; reviewId?: string }>(
      `/reviews/booking/${booking_id}`
    );
    return !!result?.hasReviewed;
  } catch {
    // If the endpoint fails (e.g. network), default to false so the UI lets
    // the user attempt to review — the backend will reject duplicates anyway.
    return false;
  }
}

/** Get the authenticated customer's reviews. */
export async function getMyReviews(): Promise<ReviewRecord[]> {
  const result = await api.get<BackendReview[] | { reviews: BackendReview[] }>("/reviews/me");
  const reviews = Array.isArray(result) ? result : (result?.reviews || []);
  return reviews.map(mapToReview);
}

// ─── Mapper ────────────────────────────────────────────────────
function mapToReview(r: BackendReview): ReviewRecord {
  const customer = r.customer || { id: "", name: "Anonymous" };
  return {
    id: r.id,
    customer_id: r.customerId || customer.id,
    customer_name: r.customerName || customer.name,
    salon_id: r.salonId || "",
    booking_id: r.bookingId || null,
    rating: r.rating,
    text: r.text || r.comment || "",
    reply: r.reply || r.salonReply || null,
    created_at: r.createdAt || "",
  };
}
