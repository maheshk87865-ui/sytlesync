/**
 * Geo Utilities — distance calculation and location helpers.
 * ------------------------------------------------------------
 * All distance calculations happen SERVER-SIDE. The frontend
 * never sends a distance value — it sends coordinates (lat/lng)
 * and the backend computes the distance using the Haversine
 * formula.
 *
 * The system supports multiple cities — Srinagar is the pilot
 * city but the architecture is city-agnostic.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface SalonWithDistance {
  id: string;
  name: string;
  distanceKm: number;       // server-calculated
  [key: string]: any;        // other salon fields
}

/**
 * Haversine formula — calculates the great-circle distance
 * between two points on Earth using latitude/longitude.
 *
 * Returns distance in kilometers.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // round to 2 decimal places
}

/**
 * Calculate distance from a customer's coordinates to a salon.
 * Returns 0 if the salon has no coordinates.
 */
export function distanceToSalon(
  customerCoords: Coordinates,
  salonLat: number | null,
  salonLng: number | null
): number {
  if (salonLat === null || salonLng === null) return 0;
  return haversineDistance(
    customerCoords.latitude, customerCoords.longitude,
    salonLat, salonLng
  );
}

/**
 * Sort salons by distance from the customer's coordinates.
 * Mutates the array in-place + returns it.
 */
export function sortByDistance(salons: any[], customerCoords: Coordinates): any[] {
  return salons
    .map((s) => ({
      ...s,
      distanceKm: distanceToSalon(customerCoords, s.latitude, s.longitude),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Filter salons within a given radius (in km) from the customer.
 */
export function filterByRadius(
  salons: any[],
  customerCoords: Coordinates,
  radiusKm: number
): any[] {
  return salons
    .filter((s) => s.latitude !== null && s.longitude !== null)
    .map((s) => ({
      ...s,
      distanceKm: distanceToSalon(customerCoords, s.latitude, s.longitude),
    }))
    .filter((s) => s.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Validate that coordinates are within valid ranges.
 */
export function validateCoordinates(lat: any, lng: any): { ok: boolean; error?: string } {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  if (isNaN(latitude) || isNaN(longitude)) {
    return { ok: false, error: "Latitude and longitude must be valid numbers." };
  }
  if (latitude < -90 || latitude > 90) {
    return { ok: false, error: "Latitude must be between -90 and 90." };
  }
  if (longitude < -180 || longitude > 180) {
    return { ok: false, error: "Longitude must be between -180 and 180." };
  }
  return { ok: true };
}

/**
 * Get a human-readable location summary for display.
 */
export function formatLocation(salon: any): string {
  const parts: string[] = [];
  if (salon.area) parts.push(salon.area);
  if (salon.city) parts.push(salon.city);
  return parts.join(", ") || "Location not available";
}
