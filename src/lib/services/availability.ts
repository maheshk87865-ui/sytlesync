/**
 * Availability Service — BACKEND-CONNECTED
 * --------------------------------------------------------------------
 * Calls the StyleSync Express backend at /api/v1/availability/* for
 * real-time slot availability.
 *
 * The backend is the SINGLE SOURCE OF TRUTH for:
 *   - slot generation (salon hours, staff availability, breaks, days off)
 *   - slot status (open / held / booked) — recalculated on every request
 *   - whether a slot is bookable (considers existing bookings + holds)
 *   - whether two customers can book the same slot (prevented via DB transactions)
 *
 * The frontend NEVER decides if a slot is available — it only displays
 * what the backend returns.
 */

import { api } from "@/lib/backend/client";
import type { AvailabilitySlot, SlotStatus } from "@/lib/types";

export interface AvailabilityFilters {
  date?: string;              // YYYY-MM-DD
  staff_id?: string;
  service_id?: string;
}

// ─── Backend response shape ───────────────────────────────────
interface BackendSlot {
  id?: string;
  salonId?: string;
  staffId?: string;
  serviceId?: string;
  date?: string;
  startTime: string;          // "10:00"
  endTime?: string;
  status?: "OPEN" | "HELD" | "BOOKED" | "BLOCKED";
  canBook?: boolean;
  available?: boolean;
  remainingSpots?: number;
  priceFrom?: number;
}

interface AvailabilityResponse {
  salonId: string;
  date: string;
  serviceId?: string;
  staffId?: string;
  slotIntervalMin?: number;
  totalSlots: number;
  availableSlots: number;
  slots: BackendSlot[];
}

/** Get all availability slots for a salon, optionally filtered. */
export async function getAvailability(salonId: string, filters: AvailabilityFilters = {}): Promise<AvailabilitySlot[]> {
  const result = await api.get<AvailabilityResponse | BackendSlot[]>(
    `/availability/${salonId}`,
    {
      auth: false,
      query: {
        date: filters.date,
        service_id: filters.service_id,
        staff_id: filters.staff_id,
      },
    }
  );

  const slots = Array.isArray(result) ? result : (result?.slots || []);
  return slots.map(mapToAvailabilitySlot);
}

/** Get today's slots for a salon (used by salon profile sheet). */
export async function getTodayAvailability(salonId: string): Promise<AvailabilitySlot[]> {
  const result = await api.get<AvailabilityResponse | BackendSlot[]>(
    `/availability/${salonId}/today`,
    { auth: false }
  );

  const slots = Array.isArray(result) ? result : (result?.slots || []);
  return slots.map(mapToAvailabilitySlot);
}

/**
 * Subscribe to realtime slot updates for a salon.
 * --------------------------------------------------------------------
 * The current backend doesn't expose websocket-based realtime updates.
 * Returns a no-op unsubscribe function until realtime is implemented.
 * Components that call this continue to work — they just won't get push
 * notifications until the realtime channel is wired up.
 *
 * For the demo, callers can call getAvailability() periodically to
 * refresh the slots.
 */
export function subscribeToAvailability(
  _salonId: string,
  _onUpdate: (slots: AvailabilitySlot[]) => void
): () => void {
  return () => {};
}

// ─── Mapper ────────────────────────────────────────────────────
function mapToAvailabilitySlot(s: BackendSlot): AvailabilitySlot {
  // Map backend slot status → frontend SlotStatus
  let status: SlotStatus = "open";
  if (s.status === "BOOKED" || s.status === "BLOCKED") status = "booked";
  else if (s.status === "HELD" || s.remainingSpots !== undefined && s.remainingSpots < 2) status = "limited";
  else if (s.canBook === false || s.available === false) status = "booked";

  // Convert "10:00" → "10:00 AM"
  const timeLabel = formatTimeLabel(s.startTime);

  return {
    id: s.id || `${s.staffId || "any"}-${s.startTime}`,
    salon_id: s.salonId || "",
    staff_id: s.staffId || "",
    service_id: s.serviceId || "",
    date: s.date || "",
    time: timeLabel,
    status,
  };
}

function formatTimeLabel(hhmm: string): string {
  if (!hhmm || !hhmm.includes(":")) return hhmm;
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
