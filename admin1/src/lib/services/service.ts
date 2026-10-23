/**
 * Service Catalog Service — BACKEND-CONNECTED
 * --------------------------------------------------------------------
 * Calls the StyleSync Express backend at /api/v1/services/* and
 * /api/v1/salons/:id/services for the catalog of salon services.
 *
 * The backend is the SINGLE SOURCE OF TRUTH for:
 *   - service price (price_from, price_to) — never trust frontend
 *   - service duration (duration_min) — used by slot engine
 *   - service rating (computed from real review data)
 *   - service availability per salon
 */

import { api } from "@/lib/backend/client";
import type { SalonServiceRecord, StaffMemberRecord, SalonCategory } from "@/lib/types";
import { notFoundError } from "./errors";

export interface ServiceFilters {
  category?: SalonCategory;
  price_min?: number;
  price_max?: number;
  duration_max?: number;       // minutes
  rating_min?: number;
  popular_only?: boolean;
  sort?: "price_low" | "price_high" | "rating" | "duration";
  limit?: number;
  offset?: number;
}

/** Get all services offered by a salon, with optional filters. */
export async function getSalonServices(salonId: string, filters: ServiceFilters = {}): Promise<SalonServiceRecord[]> {
  const result = await api.get<SalonServiceRecord[] | { services: SalonServiceRecord[] }>(
    `/salons/${salonId}/services`,
    {
      auth: false,
      query: {
        category: filters.category,
        popular: filters.popular_only,
        priceMin: filters.price_min,
        priceMax: filters.price_max,
        durationMax: filters.duration_max,
        ratingMin: filters.rating_min,
        sort: filters.sort,
        limit: filters.limit,
        offset: filters.offset,
      },
    }
  );
  if (Array.isArray(result)) return result;
  return result?.services || [];
}

/** Get a single service by ID (full details). */
export async function getService(serviceId: string): Promise<SalonServiceRecord> {
  try {
    return await api.get<SalonServiceRecord>(`/services/${serviceId}`, { auth: false });
  } catch (e: any) {
    if (e?.kind === "not_found") {
      throw notFoundError("This service is no longer available.");
    }
    throw e;
  }
}

/** Get the staff members of a salon (optionally filtered by service). */
export async function getSalonStaff(salonId: string, serviceId?: string): Promise<StaffMemberRecord[]> {
  const result = await api.get<StaffMemberRecord[] | { staff: StaffMemberRecord[] }>(
    `/salons/${salonId}/staff`,
    {
      auth: false,
      query: { serviceId },
    }
  );
  if (Array.isArray(result)) return result;
  return result?.staff || [];
}

/** Get a single staff member by ID. */
export async function getStaffMember(salonId: string, staffId: string): Promise<StaffMemberRecord> {
  try {
    // The backend may expose staff under /salons/:id/staff/:staffId, or we
    // fetch the list and filter client-side as a fallback.
    const list = await getSalonStaff(salonId);
    const found = list.find((s) => s.id === staffId);
    if (!found) throw notFoundError("This staff member is no longer available.");
    return found;
  } catch (e: any) {
    if (e?.kind === "not_found") throw e;
    throw e;
  }
}

/** Get service categories with counts (used by Browse by Category on Home). */
export async function getServiceCategories(): Promise<{ name: SalonCategory; service_count: number; salon_count: number }[]> {
  const result = await api.get<
    { name: SalonCategory; serviceCount: number; salonCount: number }[] |
    { categories: { name: SalonCategory; serviceCount: number; salonCount: number }[] }
  >("/categories", { auth: false });

  // Normalize backend snake_case → frontend shape
  if (Array.isArray(result)) {
    return result.map((c) => ({
      name: c.name,
      service_count: c.serviceCount,
      salon_count: c.salonCount,
    }));
  }
  return (result?.categories || []).map((c) => ({
    name: c.name,
    service_count: c.serviceCount,
    salon_count: c.salonCount,
  }));
}
