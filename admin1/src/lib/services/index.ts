/**
 * StyleSync Customer App — Data Access Services (Public Barrel)
 * --------------------------------------------------------------------
 * Re-exports all the data-access functions. Import like:
 *
 *   import {
 *     getSalons,
 *     getSalon,
 *     createBooking,
 *     getBookings,
 *     ...
 *   } from "@/lib/services";
 *
 * Each function:
 *   1. Verifies Supabase is configured (guardConfigured)
 *   2. Performs the query against Supabase
 *   3. Maps any PostgREST error to a typed BackendError
 *
 * Callers can use the `safeCall` wrapper to pattern-match on the
 * Result instead of try/catch:
 *
 *   const result = await safeCall(() => getSalons());
 *   if (result.ok) { use(result.value) }
 *   else { show(result.error.userMessage) }
 */

export * from "./errors";
export * from "./helpers";
export * from "./customer";
export * from "./salon";
export * from "./service";
export * from "./availability";
export * from "./booking";
export * from "./review";
export * from "./favorite";
export * from "./notification";
export * from "./payment-method";
export * from "./support";
export * from "./saved-look";
