// ============================================================
// Business Hours utility — shared between salon profile + bookings
//
// The booking service uses this to enforce:
//   - Salon must be OPEN (not CLOSED)
//   - Salon must be open on the requested day of week
//   - Requested time must fall within the salon's business hours for that day
//   - Requested time must NOT fall within a temporary closure window
// ============================================================

import type { BusinessHours, DayHours } from '../modules/salons/validation/schemas.js';

// Day-of-week keys in the businessHours JSON object
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/**
 * Get the business hours for a given date (YYYY-MM-DD).
 * Returns the DayHours object for that date's day-of-week.
 */
export function getBusinessHoursForDate(businessHours: BusinessHours | null, dateStr: string): DayHours | null {
  if (!businessHours) return null;
  const date = new Date(dateStr + 'T00:00:00');
  const dayKey = DAY_KEYS[date.getDay()];
  return (businessHours as any)[dayKey] ?? null;
}

/**
 * Check if the salon is open on the given date, considering:
 *   - Salon status (OPEN vs CLOSED)
 *   - Business hours for that day
 *   - Temporary closure window
 *
 * `startTime` and `endTime` are "HH:MM" in the salon's local timezone.
 * `closureStart` / `closureEnd` are ISO date-time strings (or null).
 *
 * Returns:
 *   { open: true } if the salon is open
 *   { open: false, reason: string } if closed — the reason explains why
 */
export function checkSalonOpen(input: {
  salonStatus: string;
  businessHours: BusinessHours | null;
  date: string;           // YYYY-MM-DD
  startTime: string;      // HH:MM
  endTime: string;        // HH:MM
  closureStart?: Date | string | null;
  closureEnd?: Date | string | null;
}): { open: boolean; reason?: string } {
  // 1. Salon must be OPEN
  if (input.salonStatus !== 'OPEN') {
    return { open: false, reason: 'Salon is currently closed' };
  }

  // 2. Check business hours for the requested day
  const dayHours = getBusinessHoursForDate(input.businessHours, input.date);
  if (!dayHours) {
    return { open: false, reason: 'Business hours not configured for this day' };
  }
  if (dayHours.closed || !dayHours.open || !dayHours.close) {
    return { open: false, reason: 'Salon is closed on this day' };
  }
  if (input.startTime < dayHours.open || input.endTime > dayHours.close) {
    return { open: false, reason: `Salon is open ${dayHours.open} - ${dayHours.close} on this day` };
  }

  // 3. Check temporary closure window (date-time range)
  if (input.closureStart && input.closureEnd) {
    const closureStart = new Date(input.closureStart);
    const closureEnd = new Date(input.closureEnd);
    // Build the booking's start/end as Date objects for comparison.
    // The booking date is YYYY-MM-DD; the times are HH:MM in the salon's timezone.
    // For simplicity (and matching the frontend behavior), we compare the closure
    // window against the booking date+time as UTC — the salon owner sets the
    // closure window in their local timezone, and the frontend sends it as ISO
    // date-time strings which are already in UTC.
    const bookingStart = new Date(`${input.date}T${input.startTime}:00Z`);
    const bookingEnd = new Date(`${input.date}T${input.endTime}:00Z`);
    if (bookingStart < closureEnd && bookingEnd > closureStart) {
      const reason = (input as any).closureReason || 'Salon is temporarily closed';
      return { open: false, reason };
    }
  }

  return { open: true };
}

/**
 * Helper: get a human-readable summary of the salon's current open/closed state.
 * Useful for the dashboard "Open now" badge.
 */
export function isSalonCurrentlyOpen(input: {
  salonStatus: string;
  businessHours: BusinessHours | null;
  now: Date;
  closureStart?: Date | string | null;
  closureEnd?: Date | string | null;
}): { open: boolean; reason?: string } {
  if (input.salonStatus !== 'OPEN') {
    return { open: false, reason: 'Salon is marked closed' };
  }

  // Check temporary closure
  if (input.closureStart && input.closureEnd) {
    const cs = new Date(input.closureStart);
    const ce = new Date(input.closureEnd);
    if (input.now >= cs && input.now <= ce) {
      return { open: false, reason: 'Temporarily closed' };
    }
  }

  // Check business hours for today
  const todayStr = input.now.toISOString().split('T')[0];
  const currentTime = `${String(input.now.getHours()).padStart(2, '0')}:${String(input.now.getMinutes()).padStart(2, '0')}`;
  // For the "currently open" check, we use the current time as both start and end
  // (a point-in-time check) — but the checkSalonOpen function expects a range.
  // We simulate a 1-minute window so the time falls inside business hours.
  const endMin = input.now.getHours() * 60 + input.now.getMinutes() + 1;
  const endTime = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
  return checkSalonOpen({
    salonStatus: input.salonStatus,
    businessHours: input.businessHours,
    date: todayStr,
    startTime: currentTime,
    endTime,
    closureStart: input.closureStart,
    closureEnd: input.closureEnd,
  });
}
