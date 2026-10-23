/**
 * Favorite Service — BACKEND-CONNECTED
 * --------------------------------------------------------------------
 * Calls the StyleSync Express backend at /api/v1/favorites/* for
 * saved salons.
 *
 * Customer isolation: backend uses JWT customerId, never frontend input.
 */

import { api } from "@/lib/backend/client";
import type { FavoriteRecord, SalonRecord } from "@/lib/types";

// ─── Backend response shape ────────────────────────────────────
interface BackendFavorite {
  id: string;
  customerId?: string;
  salonId?: string;
  salon?: any;
  createdAt?: string;
}

/** Get the authenticated customer's saved salons. */
export async function getFavorites(_customer_id: string): Promise<SalonRecord[]> {
  // customer_id is ignored — backend derives identity from JWT.
  const result = await api.get<BackendFavorite[] | { favorites: BackendFavorite[] }>("/favorites");
  const rows = Array.isArray(result) ? result : (result?.favorites || []);
  return rows
    .map((row) => row.salon as SalonRecord | undefined)
    .filter((s): s is SalonRecord => !!s);
}

/** Check if a salon is in the customer's favorites. */
export async function isFavorited(_customer_id: string, salonId: string): Promise<boolean> {
  try {
    const result = await api.get<{ favorited: boolean; exists?: boolean }>(
      `/favorites/${salonId}/check`
    );
    return !!(result?.favorited || result?.exists);
  } catch {
    return false;
  }
}

/** Add a salon to favorites. Returns the created record. */
export async function addFavorite(_customer_id: string, salonId: string): Promise<FavoriteRecord> {
  const result = await api.post<BackendFavorite>(`/favorites/${salonId}`);
  return {
    id: result.id,
    customer_id: result.customerId || "",
    salon_id: result.salonId || salonId,
    created_at: result.createdAt || "",
  };
}

/** Remove a salon from favorites. */
export async function removeFavorite(_customer_id: string, salonId: string): Promise<void> {
  await api.del(`/favorites/${salonId}`);
}

/** Toggle favorite state — returns true if now favorited, false if removed. */
export async function toggleFavorite(_customer_id: string, salonId: string): Promise<boolean> {
  const already = await isFavorited(_customer_id, salonId).catch(() => false);
  if (already) {
    await removeFavorite(_customer_id, salonId);
    return false;
  }
  await addFavorite(_customer_id, salonId);
  return true;
}
