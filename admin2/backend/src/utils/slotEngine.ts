// ============================================================
// Slot Engine — The single, reusable availability calculator
//
// This module is the ONE source of truth for slot generation and overlap
// detection. It is used by:
//   - GET /api/v1/availability (the availability page)
//   - POST /api/v1/bookings (conflict prevention)
//   - GET /api/v1/calendar (calendar view)
//   - Dashboard (today's available/booked slots)
//
// It NEVER trusts frontend calculations — all overlap checks happen here
// with server-side interval math.
// ============================================================

import type { BusinessHours, DayHours } from '../modules/salons/validation/schemas.js';

// --- Types ---

export type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'BREAK' | 'UNAVAILABLE';

export interface Slot {
  startTime: string;   // "09:00"
  endTime: string;       // "09:30"
  status: SlotStatus;
  bookingId?: string;
  reason?: string;      // for BLOCKED / BREAK / UNAVAILABLE
  staffId?: string;      // which staff this slot belongs to (if staff-specific)
}

export interface BookingOverlap {
  id: string;
  startTime: string;
  endTime: string;
  status: string;        // PENDING / UPCOMING / COMPLETED (not CANCELLED — those don't block)
}

export interface BlockOverlap {
  id: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  type: 'BLOCKED' | 'BREAK';
  staffId: string | null;  // null = salon-wide
}

export interface UnavailabilityOverlap {
  id: string;
  startTime: string;
  endTime: string;
  reason: string | null;
}

// --- Helpers ---

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Interval overlap check: does [aStart, aEnd) overlap [bStart, bEnd)?
 * Half-open: a slot ending at 10:00 does NOT conflict with one starting at 10:00.
 */
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const aS = timeToMinutes(aStart);
  const aE = timeToMinutes(aEnd);
  const bS = timeToMinutes(bStart);
  const bE = timeToMinutes(bEnd);
  return aS < bE && aE > bS;
}

// --- Day-key helper ---

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function getDayKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_KEYS[d.getDay()];
}

// --- Core engine ---

export interface SlotEngineInput {
  // Salon state
  salonStatus: string;                // 'OPEN' | 'CLOSED'
  businessHours: BusinessHours | null;
  // Temporary closure (optional)
  closureStart?: Date | string | null;
  closureEnd?: Date | string | null;
  // The date we're generating slots for
  date: string;                       // YYYY-MM-DD
  // Service duration (from the DB, not frontend)
  serviceDurationMin: number;
  // Staff schedule for this day (null if staff doesn't work)
  staffSchedule: { startTime: string | null; endTime: string | null; isWorking: boolean } | null;
  // Staff unavailability entries for this date
  staffUnavailabilities: UnavailabilityOverlap[];
  // Existing non-cancelled bookings for this staff on this date
  existingBookings: BookingOverlap[];
  // Blocked slots + breaks (salon-wide + staff-specific)
  blockedSlots: BlockOverlap[];
  // Slot interval (default 30 min — but service duration determines actual slot length)
  slotIntervalMin?: number;
  // Optional: filter to only this staff (for staff-specific availability queries)
  staffId?: string;
}

export interface SlotEngineResult {
  slots: Slot[];
  open: boolean;
  reason?: string;  // if !open, why
}

/**
 * Generate available/booked/blocked/break/unavailable slots for a given
 * date + staff + service combination.
 *
 * The engine:
 *   1. Checks salon status (OPEN/CLOSED) + business hours + temporary closure
 *   2. Checks staff schedule (isWorking, startTime/endTime)
 *   3. Generates candidate slots of `serviceDurationMin` length within the
 *      intersection of salon business hours and staff working hours
 *   4. For each candidate slot, checks against:
 *      - Existing bookings (BOOKED)
 *      - Blocked slots (BLOCKED)
 *      - Breaks (BREAK)
 *      - Staff unavailability (UNAVAILABLE)
 *   5. Returns the full slot list with status + reason
 */
export function generateSlots(input: SlotEngineInput): SlotEngineResult {
  // --- 1. Salon checks ---
  if (input.salonStatus !== 'OPEN') {
    return { slots: [], open: false, reason: 'Salon is currently closed' };
  }

  if (!input.businessHours) {
    return { slots: [], open: false, reason: 'Business hours not configured' };
  }

  const dayKey = getDayKey(input.date);
  const salonDay: DayHours | null = (input.businessHours as any)[dayKey] ?? null;
  if (!salonDay || salonDay.closed || !salonDay.open || !salonDay.close) {
    return { slots: [], open: false, reason: 'Salon is closed on this day' };
  }

  // --- Temporary closure check ---
  if (input.closureStart && input.closureEnd) {
    const cs = new Date(input.closureStart);
    const ce = new Date(input.closureEnd);
    const bookingStart = new Date(`${input.date}T00:00:00Z`);
    const bookingEnd = new Date(`${input.date}T23:59:59Z`);
    if (bookingStart < ce && bookingEnd > cs) {
      return { slots: [], open: false, reason: 'Salon is temporarily closed on this date' };
    }
  }

  // --- 2. Staff schedule ---
  if (!input.staffSchedule || !input.staffSchedule.isWorking || !input.staffSchedule.startTime || !input.staffSchedule.endTime) {
    return { slots: [], open: false, reason: 'Staff member is not working on this day' };
  }

  // The working window is the intersection of salon hours and staff hours
  const windowStart = Math.max(timeToMinutes(salonDay.open!), timeToMinutes(input.staffSchedule.startTime));
  const windowEnd = Math.min(timeToMinutes(salonDay.close!), timeToMinutes(input.staffSchedule.endTime));

  if (windowStart >= windowEnd) {
    return { slots: [], open: false, reason: 'No overlapping working hours between salon and staff' };
  }

  // --- 3. Generate candidate slots ---
  const duration = input.serviceDurationMin;
  const slots: Slot[] = [];

  for (let t = windowStart; t + duration <= windowEnd; t += duration) {
    const slotStart = minutesToTime(t);
    const slotEnd = minutesToTime(t + duration);

    // --- 4a. Check existing bookings ---
    const booking = input.existingBookings.find((b) => overlaps(slotStart, slotEnd, b.startTime, b.endTime));
    if (booking) {
      slots.push({ startTime: slotStart, endTime: slotEnd, status: 'BOOKED', bookingId: booking.id, staffId: input.staffId });
      continue;
    }

    // --- 4b. Check staff unavailability ---
    const unavail = input.staffUnavailabilities.find((u) => overlaps(slotStart, slotEnd, u.startTime, u.endTime));
    if (unavail) {
      slots.push({ startTime: slotStart, endTime: slotEnd, status: 'UNAVAILABLE', reason: unavail.reason || 'Staff unavailable', staffId: input.staffId });
      continue;
    }

    // --- 4c. Check blocked slots (salon-wide + staff-specific) ---
    const block = input.blockedSlots.find((bl) => {
      // A salon-wide block (staffId=null) applies to everyone.
      // A staff-specific block (staffId=X) only applies if we're querying for that staff.
      const appliesToThisStaff = bl.staffId === null || bl.staffId === input.staffId;
      if (!appliesToThisStaff) return false;
      return overlaps(slotStart, slotEnd, bl.startTime, bl.endTime);
    });
    if (block) {
      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        status: block.type === 'BREAK' ? 'BREAK' : 'BLOCKED',
        reason: block.reason || undefined,
        staffId: input.staffId,
      });
      continue;
    }

    // --- 4d. No conflicts → AVAILABLE ---
    slots.push({ startTime: slotStart, endTime: slotEnd, status: 'AVAILABLE', staffId: input.staffId });
  }

  return { slots, open: true };
}

/**
 * Quick check: is a specific time slot available for booking?
 * Used by the bookings service to validate a booking request.
 *
 * Returns { available: true } or { available: false, reason: string }
 */
export function isSlotAvailable(input: SlotEngineInput, requestedStart: string): { available: boolean; reason?: string } {
  const result = generateSlots(input);
  if (!result.open) return { available: false, reason: result.reason };

  const slot = result.slots.find((s) => s.startTime === requestedStart && s.status === 'AVAILABLE');
  if (slot) return { available: true };

  // Find the slot at this time to get a specific reason
  const statusSlot = result.slots.find((s) => s.startTime === requestedStart);
  if (statusSlot) {
    return { available: false, reason: `Slot is ${statusSlot.status}${statusSlot.reason ? ': ' + statusSlot.reason : ''}` };
  }

  // No slot at this time at all (outside working window)
  return { available: false, reason: 'No available slot at this time' };
}
