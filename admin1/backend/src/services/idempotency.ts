/**
 * Idempotency Service — prevents duplicate records from retried requests.
 * ------------------------------------------------------------
 * The frontend sends an `Idempotency-Key` header on POST requests.
 * The backend stores the key + response for 24 hours.
 * If the same key is received again, the stored response is returned
 * instead of creating a duplicate record.
 *
 * Used for:
 *   - Booking creation (prevent duplicate bookings)
 *   - Payment creation (prevent duplicate payments)
 *   - Payment webhook (prevent duplicate processing)
 *   - Refunds (prevent duplicate refunds)
 */

const idempotencyStore = new Map<string, { response: any; expiresAt: number }>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if a request with this idempotency key has already been processed.
 * If yes, return the stored response.
 * If no, return null (the request should proceed normally).
 */
export function getIdempotentResponse(key: string): any | null {
  const entry = idempotencyStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    idempotencyStore.delete(key);
    return null;
  }
  return entry.response;
}

/**
 * Store a response for an idempotency key.
 * The same key received again will return this stored response.
 */
export function storeIdempotentResponse(key: string, response: any): void {
  idempotencyStore.set(key, {
    response,
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
  });
}

/**
 * Extract the idempotency key from request headers.
 * Returns null if no key is provided.
 */
export function getIdempotencyKey(req: any): string | null {
  const key = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];
  if (!key || typeof key !== "string") return null;
  return key;
}

/**
 * Cleanup expired entries (called periodically).
 */
export function cleanupIdempotencyStore(): void {
  const now = Date.now();
  for (const [key, entry] of idempotencyStore.entries()) {
    if (now > entry.expiresAt) {
      idempotencyStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupIdempotencyStore, 5 * 60 * 1000).unref();
