/**
 * Service Helpers
 * --------------------------------------------------------------------
 * Shared utilities used by every data-access service.
 *   - guardConfigured: legacy compatibility — now always returns
 *     (the backend client handles unconfigured state internally)
 *   - sanitize: trims + uppercases booking IDs / IDs that come from
 *     user input.
 *   - mapBackendError: maps REST API errors to typed BackendError
 *     (handled inside the backend client — kept here for legacy code
 *     that may still call it).
 */

import { BackendError, databaseError } from "./errors";

/**
 * No-op guard — kept for backwards compatibility with code that
 * imported it. The backend client handles configuration errors
 * internally; there is no separate "is configured" check needed.
 */
export function guardConfigured(): void {
  // intentional no-op
}

/**
 * Legacy error mapper — kept for backwards compatibility. The backend
 * client now handles error mapping internally (see mapBackendError
 * in src/lib/backend/client.ts).
 */
export function mapPostgrestError(e: any): BackendError {
  // Should not be called anymore — services now use the backend client
  // which throws already-mapped BackendError objects. If a stray call
  // does slip through, return a generic database error.
  return databaseError("Service error. Please try again.", e);
}

/**
 * Sanitizes a user-provided ID (booking ID, salon ID, etc.). Strips
 * whitespace, uppercases if it looks like a booking ID.
 */
export function sanitizeId(id: string): string {
  const trimmed = (id || "").trim();
  if (trimmed.toUpperCase().startsWith("SS-")) {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

/**
 * Return current YYYY-MM-DD in Asia/Kolkata timezone (Srinagar, India).
 */
export function getTodayDateStringIST(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    const d = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(d.getTime() + istOffset);
    return istDate.toISOString().split("T")[0];
  }
}
