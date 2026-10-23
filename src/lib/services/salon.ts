/**
 * Salon Service — BACKEND-CONNECTED
 * --------------------------------------------------------------------
 * Calls the StyleSync Express backend at /api/v1/salons/* for all salon
 * discovery, search, filtering, and details.
 *
 * The backend is the SINGLE SOURCE OF TRUTH for:
 *   - which salons are published (is_published=true)
 *   - which salons are verified (verified=true)
 *   - distance calculation (Haversine, server-side)
 *   - rating computation (from real review data)
 *   - "open now" status (based on salon business hours)
 *
 * The frontend only displays what the backend returns.
 */

import { api } from "@/lib/backend/client";
import type { SalonRecord, SalonCategory } from "@/lib/types";
import { notFoundError } from "./errors";

export interface SalonListFilters {
  category?: SalonCategory;
  city?: string;
  open_now?: boolean;
  verified?: boolean;
  nearby_km?: number;          // radius from customer's location
  customer_lat?: number;
  customer_lng?: number;
  sort?: "distance" | "rating" | "price_low" | "price_high";
  search?: string;
  limit?: number;
  offset?: number;
}

/** List salons with optional filters. Returns empty array on no match (not an error). */
export async function getSalons(filters: SalonListFilters = {}): Promise<SalonRecord[]> {
  // Backend is the source of truth — pass filters as query params, let the
  // backend apply them with proper SQL and return only published salons.
  const result = await api.get<SalonRecord[] | { salons: SalonRecord[]; total: number }>("/salons", {
    auth: false,
    query: {
      category: filters.category,
      city: filters.city,
      openNow: filters.open_now,
      verified: filters.verified,
      radiusKm: filters.nearby_km,
      lat: filters.customer_lat,
      lng: filters.customer_lng,
      sort: filters.sort,
      q: filters.search,
      limit: filters.limit,
      offset: filters.offset,
    },
  });

  // Backend may return either an array or a paginated object — handle both
  if (Array.isArray(result)) return result;
  return result?.salons || [];
}

/** Get a single salon by ID (with full details). */
export async function getSalon(salonId: string): Promise<SalonRecord> {
  try {
    return await api.get<SalonRecord>(`/salons/${salonId}`, { auth: false });
  } catch (e: any) {
    if (e?.kind === "not_found") {
      throw notFoundError("This salon is no longer available on StyleSync.");
    }
    throw e;
  }
}

/** Get featured salons for the Home page (verified + top-rated). */
export async function getFeaturedSalons(limit: number = 8): Promise<SalonRecord[]> {
  const result = await api.get<SalonRecord[] | { salons: SalonRecord[] }>(
    "/salons/featured",
    { auth: false, query: { limit } }
  );
  if (Array.isArray(result)) return result;
  return result?.salons || [];
}

/** Search salons by name, tagline, or service name. */
export async function searchSalons(query: string, city?: string): Promise<SalonRecord[]> {
  const result = await api.get<SalonRecord[] | { salons: SalonRecord[] }>("/search/salons", {
    auth: false,
    query: { q: query, city, limit: 20 },
  });
  if (Array.isArray(result)) return result;
  return result?.salons || [];
}

/**
 * Subscribe to realtime salon changes.
 * --------------------------------------------------------------------
 * The current backend doesn't expose websocket-based realtime updates.
 * Returns a no-op unsubscribe function until realtime is implemented.
 * Components that call this continue to work — they just won't get push
 * notifications until the realtime channel is wired up.
 */
export function subscribeToSalonUpdates(
  _onChange: (payload: { eventType: string; new: SalonRecord | null; old: SalonRecord | null }) => void
): () => void {
  // No-op until backend realtime is wired up. Caller can safely hold the
  // unsubscribe handle — calling it does nothing.
  return () => {};
}
