/**
 * Customer Service — BACKEND-CONNECTED
 * --------------------------------------------------------------------
 * Calls the StyleSync Express backend at /api/v1/customers/* and
 * /api/v1/auth/me for the authenticated customer's profile, stats,
 * preferences, and location.
 *
 * Customer isolation:
 *   - The backend uses the JWT's customerId claim — never trusts a
 *     customerId sent from the frontend.
 *   - Customer A can NEVER read or modify Customer B's data.
 */

import { api } from "@/lib/backend/client";
import type { CustomerProfile } from "@/lib/types";
import { authError, notFoundError } from "./errors";

// ─── Backend response shapes ──────────────────────────────────
interface BackendCustomerResponse {
  user: {
    id: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    emailVerified: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  };
  profile: {
    userId: string;
    fullName: string;
    email: string;
    phone: string | null;
    profileImage: string | null;
    city: string | null;
    bio: string | null;
  } | null;
  preferences: {
    userId: string;
    preferredServices: string[];
    preferredCities: string[];
    priceRangeMin: number | null;
    priceRangeMax: number | null;
    notifications: { email: boolean; sms: boolean; push: boolean; };
  } | null;
  customerId?: string;
  stats?: {
    bookings: number;
    completed: number;
    savedSalons: number;
    savedLooks: number;
    reviews: number;
  };
}

/** Get the currently authenticated customer's full profile. */
export async function getCustomerProfile(_authId: string): Promise<CustomerProfile> {
  // The authId parameter is kept for API compatibility — but the backend
  // derives identity from the JWT, never from a frontend-supplied id.
  try {
    const data = await api.get<BackendCustomerResponse>("/customers/me");

    // Fetch stats separately (the /me endpoint doesn't include stats)
    let stats = data.stats;
    if (!stats) {
      try {
        const statsResp = await api.get<{ bookings: number; completed: number; savedSalons: number; savedLooks: number; reviews: number; }>("/history/stats");
        stats = statsResp;
      } catch {
        stats = { bookings: 0, completed: 0, savedSalons: 0, savedLooks: 0, reviews: 0 };
      }
    }

    return mapToCustomerProfile(data, stats!);
  } catch (e: any) {
    if (e?.kind === "auth") {
      throw authError("Please sign in to view your profile.");
    }
    if (e?.kind === "not_found") {
      throw notFoundError("Your profile is being set up. Please try again in a moment.");
    }
    throw e;
  }
}

/** Update the authenticated customer's editable fields. */
export async function updateCustomerProfile(
  _authId: string,
  patch: Partial<Pick<CustomerProfile, "name" | "mobile" | "city" | "preferred_services" | "avatar_url">>
): Promise<CustomerProfile> {
  // Map frontend field names → backend field names
  const backendPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) backendPatch.fullName = patch.name;
  if (patch.mobile !== undefined) backendPatch.phone = patch.mobile;
  if (patch.city !== undefined) backendPatch.city = patch.city;
  if (patch.avatar_url !== undefined) backendPatch.profileImage = patch.avatar_url;
  if (patch.preferred_services !== undefined) {
    // Update preferences separately
    await api.patch("/customers/me/preferences", {
      preferredServices: patch.preferred_services,
    }).catch(() => { /* best-effort — preferences may not be set up */ });
  }

  const data = await api.patch<BackendCustomerResponse>("/customers/me", backendPatch);
  return mapToCustomerProfile(data, {
    bookings: 0, completed: 0, savedSalons: 0, savedLooks: 0, reviews: 0,
  });
}

/** Get the customer's location for location-based salon discovery. */
export async function getCustomerLocation(_authId: string): Promise<{ city: string | null; latitude: number | null; longitude: number | null }> {
  const data = await api.get<{ city: string | null; latitude: number | null; longitude: number | null }>("/customers/me/location");
  return data;
}

/** Update the customer's preferred service categories (used by AI recommendations). */
export async function setCustomerPreferredServices(
  _authId: string,
  services: string[]
): Promise<void> {
  await api.patch("/customers/me/preferences", {
    preferredServices: services,
  });
}

// ─── Mapper ────────────────────────────────────────────────────
function mapToCustomerProfile(
  data: BackendCustomerResponse,
  stats: { bookings: number; completed: number; savedSalons: number; savedLooks: number; reviews: number }
): CustomerProfile {
  const user = data.user;
  const profile = data.profile;
  return {
    id: data.customerId || user.id,
    auth_id: user.id,
    name: profile?.fullName || user.email,
    email: user.email,
    mobile: profile?.phone || user.phone || null,
    city: profile?.city || null,
    preferred_services: data.preferences?.preferredServices || [],
    avatar_url: profile?.profileImage || null,
    member_since: user.createdAt,
    stats: {
      bookings: stats.bookings,
      completed: stats.completed,
      saved_salons: stats.savedSalons,
      saved_looks: stats.savedLooks,
      reviews: stats.reviews,
    },
    created_at: user.createdAt,
    updated_at: user.lastLoginAt || user.createdAt,
  };
}
