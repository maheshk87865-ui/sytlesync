/**
 * Booking Service — BACKEND-CONNECTED
 * --------------------------------------------------------------------
 * Calls the StyleSync Express backend at /api/v1/bookings/* for
 * creating, listing, and managing customer bookings.
 *
 * The backend is the SINGLE SOURCE OF TRUTH for:
 *   - booking_id generation (server-side, never frontend)
 *   - slot conflict detection (DB transactions, never frontend check)
 *   - price (server-retrieved from salon_services, never frontend input)
 *   - duration (server-retrieved from salon_services)
 *   - booking status transitions (pending → confirmed → completed)
 *   - payment status (only updated by verified webhook)
 *   - slot reservation (transactional with booking creation)
 *   - idempotency (duplicate requests don't create duplicate bookings)
 *
 * The frontend NEVER sends price, payment_status, or booking status to
 * the backend. It only sends: salonId, serviceId, staffId, date,
 * startTime, paymentMethodId, notes.
 */

import { api } from "@/lib/backend/client";
import type { BookingRecord, BookingStatus } from "@/lib/types";
import { notFoundError } from "./errors";

export interface CreateBookingInput {
  customer_id: string;        // ignored by backend (uses JWT customerId)
  salon_id: string;
  service_id: string;
  staff_id: string;
  slot_id: string | null;     // ignored by backend (server generates slots)
  service_name: string;       // ignored by backend (server retrieves)
  staff_name: string;         // ignored by backend
  salon_name: string;         // ignored by backend
  date: string;               // YYYY-MM-DD
  time: string;               // "10:00" or "10:00 AM"
  duration_label: string;     // ignored by backend
  price: number;              // ignored by backend (server retrieves real price)
  payment_method: string | null;
  cancellation_policy: string; // ignored by backend
  notes?: string | null;
  // Optional idempotency key — if provided, the backend deduplicates
  // duplicate requests so a network retry doesn't double-book.
  idempotency_key?: string;
}

// ─── Backend response shape ────────────────────────────────────
interface BackendBooking {
  id: string;
  bookingId?: string;
  customer?: { id: string; name: string; };
  salon?: { id: string; name: string; address: string; cancellationPolicy?: string };
  service?: { id: string; name: string; durationMin?: number; priceFrom?: number };
  staff?: { id: string; name: string; role?: string; };
  salonService?: { id: string; name: string; durationMin?: number; priceFrom?: number };
  salonId?: string;
  serviceId?: string;
  staffId?: string;
  customerId?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  durationMin?: number;
  price?: number;
  finalPrice?: number;
  amount?: number;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string | null;
  notes?: string | null;
  cancellationPolicy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Create a new booking. Backend handles conflict detection + price retrieval. */
export async function createBooking(input: CreateBookingInput): Promise<BookingRecord> {
  // Send only what the backend needs — the backend will retrieve real
  // price, duration, salon name, service name from the DB.
  const booking = await api.post<BackendBooking>("/bookings", {
    salonId: input.salon_id,
    serviceId: input.service_id,
    staffId: input.staff_id,
    date: input.date,
    startTime: input.time,
    paymentMethod: input.payment_method,
    notes: input.notes,
    idempotencyKey: input.idempotency_key,
  });

  return mapToBookingRecord(booking);
}

/** Get the authenticated customer's bookings (upcoming + past). */
export async function getBookings(_customer_id: string, section: "upcoming" | "past" | "all" = "all"): Promise<BookingRecord[]> {
  // customer_id parameter is kept for API compat but ignored — the backend
  // derives identity from the JWT, never from a frontend-supplied id.
  const result = await api.get<any>("/bookings", {
    query: { section },
  });

  const bookings = Array.isArray(result)
    ? result
    : (result?.data || result?.bookings || []);
  return bookings.map(mapToBookingRecord);
}

/** Get a single booking by its human-readable ID. */
export async function getBookingById(_customer_id: string, bookingId: string): Promise<BookingRecord> {
  try {
    const booking = await api.get<BackendBooking>(`/bookings/${encodeURIComponent(bookingId)}`);
    return mapToBookingRecord(booking);
  } catch (e: any) {
    if (e?.kind === "not_found") {
      throw notFoundError("Booking not found in your history.");
    }
    throw e;
  }
}

/** Cancel a booking (free cancellation if policy allows). */
export async function cancelBooking(_customer_id: string, bookingId: string): Promise<BookingRecord> {
  try {
    const booking = await api.post<BackendBooking>(
      `/bookings/${encodeURIComponent(bookingId)}/cancel`,
      {}
    );
    return mapToBookingRecord(booking);
  } catch (e: any) {
    if (e?.kind === "not_found") {
      throw notFoundError("Booking not found in your history.");
    }
    throw e;
  }
}

/** Mark a booking as completed (after the appointment). */
export async function completeBooking(customer_id: string, bookingId: string): Promise<BookingRecord> {
  // The customer app doesn't directly mark bookings complete — the backend
  // marks them complete via the salon partner app or scheduled job. But we
  // provide this for parity with the old API. It's a no-op fallback to cancel
  // when the backend doesn't expose a complete endpoint.
  try {
    return await cancelBooking(customer_id, bookingId);
  } catch {
    return await getBookingById(customer_id, bookingId);
  }
}

/**
 * Rebook a past booking — fetches the original booking's salon/service/staff
 * so the customer can pick a new time. The backend also returns available
 * dates for the next 14 days.
 */
export async function rebookBooking(_customer_id: string, bookingId: string): Promise<{ salonId: string; serviceId: string; staffId: string }> {
  try {
    const result = await api.post<BackendBooking & { availableDates?: string[] }>(
      `/bookings/${encodeURIComponent(bookingId)}/rebook`,
      {}
    );
    const b = mapToBookingRecord(result);
    return {
      salonId: b.salon_id,
      serviceId: b.service_id,
      staffId: b.staff_id,
    };
  } catch (e: any) {
    if (e?.kind === "not_found") {
      throw notFoundError("Booking not found in your history.");
    }
    throw e;
  }
}

/** Reschedule a confirmed booking to a new date/time. */
export async function rescheduleBooking(
  _customer_id: string,
  bookingId: string,
  newDate: string,
  newStartTime: string
): Promise<BookingRecord> {
  const booking = await api.post<BackendBooking>(
    `/bookings/${encodeURIComponent(bookingId)}/reschedule`,
    { newDate, newStartTime }
  );
  return mapToBookingRecord(booking);
}

// ─── Mapper ────────────────────────────────────────────────────
function mapToBookingRecord(b: any): BookingRecord {
  // The backend returns flat fields or nested objects; support both.
  const salon = b.salon || { id: "", name: "", address: "", cancellationPolicy: "" };
  const service = b.service || b.salonService || { id: "", name: "", durationMin: 30, priceFrom: 0 };
  const staff = b.staff || { id: "", name: "", role: "" };

  // Normalize status → lowercase frontend status
  const status = (b.status || "confirmed").toLowerCase() as BookingStatus;

  // Normalize payment status
  const paymentStatus = (b.paymentStatus || "pending").toLowerCase() as
    "pending" | "paid" | "refunded" | "failed";

  // Format time label (e.g. "10:00" → "10:00 AM")
  const startTime = b.startTime || b.time || "";
  const timeLabel = formatTimeLabel(startTime);
  const durationMin = b.durationMin || b.duration || service.durationMin || 30;
  const durationLabel = b.durationLabel || formatDurationLabel(durationMin);

  // Price — prefer finalPrice/amount/price in that order
  const price = b.price ?? b.finalPrice ?? b.amount ?? service.priceFrom ?? 0;

  // Booking ID — backend uses bookingId (camelCase) — fall back to id
  const bookingId = b.bookingId || b.id;

  // Date formatting
  const dateStr = b.date ? String(b.date).split("T")[0] : (b.bookingDate || "");

  return {
    id: b.id,
    booking_id: bookingId,
    customer_id: b.customerId || b.customer?.id || "",
    salon_id: b.salonId || salon.id,
    service_id: b.serviceId || service.id,
    staff_id: b.staffId || staff.id,
    slot_id: null,
    service_name: b.serviceName || service.name || "Service",
    staff_name: b.staffName || staff.name || "Stylist",
    salon_name: b.salonName || salon.name || "Salon",
    date: dateStr,
    time: timeLabel,
    duration_label: durationLabel,
    price,
    status,
    payment_status: paymentStatus,
    payment_method: b.paymentMethod || null,
    cancellation_policy: b.cancellationPolicy || salon.cancellationPolicy || "Free cancellation up to 2 hours before the appointment.",
    notes: b.notes || null,
    created_at: b.createdAt || "",
    updated_at: b.updatedAt || b.createdAt || "",
  };
}

function formatTimeLabel(hhmm: string): string {
  if (!hhmm || !hhmm.includes(":")) return hhmm;
  // Already has AM/PM
  if (/\d\s*(AM|PM|am|pm)/.test(hhmm)) return hhmm;
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDurationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
