// ============================================================
// Calendar — Service (normalizes DB data into calendar events)
//
// Returns a unified list of "calendar events" that the frontend can
// render for month/week/day views. Each event has a type:
//
//   BOOKED      — an existing booking (with customer, service, staff, price)
//   AVAILABLE   — a slot that's open for booking
//   BLOCKED     — a salon-wide or staff-specific blocked slot
//   BREAK       — a salon-wide or staff-specific break
//   UNAVAILABLE — staff temporary time-off
//   CLOSED      — salon is closed this day (status or business hours)
//
// The service uses the slot engine for AVAILABLE slot generation,
// ensuring the calendar's "available" slots match exactly what the
// booking engine would allow.
// ============================================================

import { calendarRepository } from '../repository/calendar.repository.js';
import { generateSlots } from '../../../utils/slotEngine.js';
import { NotFoundError } from '../../../middleware/errorHandler.js';
import type { CalendarQueryInput } from '../validation/schemas.js';

// --- Calendar event types ---

export interface CalendarEvent {
  id: string;
  type: 'BOOKED' | 'AVAILABLE' | 'BLOCKED' | 'BREAK' | 'UNAVAILABLE' | 'CLOSED';
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  // For BOOKED events
  bookingId?: string;
  customerName?: string;
  customerPhone?: string;
  serviceName?: string;
  staffId?: string;
  staffName?: string;
  pricePaise?: number;
  status?: string;     // PENDING / UPCOMING / COMPLETED / CANCELLED
  paymentStatus?: string;
  // For BLOCKED / BREAK / UNAVAILABLE events
  reason?: string;
}

// --- Date helpers ---

function getDayKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d.getDay()];
}

function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const d = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (d <= end) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function computeViewRange(view: string, startDate?: string, endDate?: string): { start: string; end: string } {
  const today = new Date().toISOString().split('T')[0];
  if (startDate && endDate) return { start: startDate, end: endDate };
  if (startDate) {
    // If only startDate given, derive end from view
    if (view === 'DAY') return { start: startDate, end: startDate };
    if (view === 'WEEK') {
      const d = new Date(startDate + 'T00:00:00');
      const end = new Date(d);
      end.setDate(d.getDate() + 6);
      return { start: startDate, end: end.toISOString().split('T')[0] };
    }
    // MONTH
    const d = new Date(startDate + 'T00:00:00');
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: startDate, end: end.toISOString().split('T')[0] };
  }
  // No startDate → use today as anchor
  if (view === 'DAY') return { start: today, end: today };
  if (view === 'WEEK') {
    const d = new Date(today + 'T00:00:00');
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay()); // Sunday
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Saturday
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  }
  // MONTH
  const d = new Date(today + 'T00:00:00');
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

export class CalendarService {
  async getCalendar(salonId: string, input: CalendarQueryInput): Promise<{
    view: string;
    startDate: string;
    endDate: string;
    events: CalendarEvent[];
    summary: { total: number; booked: number; available: number; blocked: number; breaks: number; unavailable: number; closed: number; };
  }> {
    const { start, end } = computeViewRange(input.view, input.startDate, input.endDate);

    const data = await calendarRepository.getRangeData(salonId, start, end, input.staffId);
    if (!data.salon) throw new NotFoundError('Salon not found');

    const events: CalendarEvent[] = [];
    const dates = dateRange(start, end);

    // Group bookings by date+staffId for slot generation
    const bookingsByDateStaff = new Map<string, typeof data.bookings>();
    for (const b of data.bookings) {
      const key = `${b.date.toISOString().split('T')[0]}_${b.staffId}`;
      if (!bookingsByDateStaff.has(key)) bookingsByDateStaff.set(key, []);
      bookingsByDateStaff.get(key)!.push(b);
    }

    // Group blocked slots by date
    const blockedByDate = new Map<string, typeof data.blockedSlots>();
    for (const bl of data.blockedSlots) {
      const key = bl.date.toISOString().split('T')[0];
      if (!blockedByDate.has(key)) blockedByDate.set(key, []);
      blockedByDate.get(key)!.push(bl);
    }

    // Group unavailabilities by date+staffId
    const unavailByDateStaff = new Map<string, typeof data.staffUnavailabilities>();
    for (const u of data.staffUnavailabilities) {
      const key = `${u.date.toISOString().split('T')[0]}_${u.staffId}`;
      if (!unavailByDateStaff.has(key)) unavailByDateStaff.set(key, []);
      unavailByDateStaff.get(key)!.push(u);
    }

    // For each date in the range, generate events
    for (const dateStr of dates) {
      // Check if salon is open this day (business hours)
      const businessHours = data.salon.businessHours as any;
      const dayKey = getDayKey(dateStr);
      const salonDay = businessHours?.[dayKey];
      const salonClosed = data.salon.status !== 'OPEN' || !salonDay || salonDay.closed;

      // Emit CLOSED event if salon is closed this day (only in DAY/WEEK view for clarity)
      if (salonClosed && (input.view === 'DAY' || input.view === 'WEEK')) {
        events.push({
          id: `closed-${dateStr}`,
          type: 'CLOSED',
          date: dateStr,
          startTime: '00:00',
          endTime: '23:59',
          reason: data.salon.status !== 'OPEN' ? 'Salon is closed' : 'Closed on this day',
        });
        continue; // No point generating slots if salon is closed
      }

      // Emit BLOCKED + BREAK events
      const dateBlocks = blockedByDate.get(dateStr) || [];
      for (const bl of dateBlocks) {
        events.push({
          id: bl.id,
          type: bl.type === 'BREAK' ? 'BREAK' : 'BLOCKED',
          date: dateStr,
          startTime: bl.startTime,
          endTime: bl.endTime,
          reason: bl.reason || undefined,
          staffId: bl.staffId || undefined,
        });
      }

      // Emit UNAVAILABLE events (staff time-off)
      const allStaffIds = data.staffList.map((s) => s.id);
      for (const staffId of allStaffIds) {
        const staffUnavail = unavailByDateStaff.get(`${dateStr}_${staffId}`) || [];
        for (const u of staffUnavail) {
          events.push({
            id: u.id,
            type: 'UNAVAILABLE',
            date: dateStr,
            startTime: u.startTime,
            endTime: u.endTime,
            reason: u.reason || 'Staff unavailable',
            staffId: u.staffId,
            staffName: u.staff.name,
          });
        }
      }

      // Emit BOOKED events (actual bookings)
      const dateBookings = data.bookings.filter((b) => b.date.toISOString().split('T')[0] === dateStr);
      for (const b of dateBookings) {
        events.push({
          id: b.id,
          type: 'BOOKED',
          date: dateStr,
          startTime: b.startTime,
          endTime: b.endTime,
          bookingId: b.id,
          customerName: b.customerName,
          customerPhone: b.customerPhone,
          serviceName: b.serviceName,
          staffId: b.staffId,
          staffName: b.staffName,
          pricePaise: b.pricePaise,
          status: b.status,
          paymentStatus: b.paymentStatus,
        });
      }

      // Emit AVAILABLE slots (using the slot engine for accuracy)
      // For MONTH view, skip available-slot generation (too many slots)
      if (input.view !== 'MONTH') {
        for (const staff of data.staffList) {
          const schedule = staff.schedules.find((s) => s.dayOfWeek === new Date(dateStr + 'T00:00:00').getDay());

          const staffBookings = (bookingsByDateStaff.get(`${dateStr}_${staff.id}`) || [])
            .filter((b) => b.status !== 'CANCELLED')
            .map((b) => ({ id: b.id, startTime: b.startTime, endTime: b.endTime, status: b.status }));

          const staffUnavail = (unavailByDateStaff.get(`${dateStr}_${staff.id}`) || [])
            .map((u) => ({ id: u.id, startTime: u.startTime, endTime: u.endTime, reason: u.reason }));

          const staffBlocks = dateBlocks
            .filter((bl) => bl.staffId === null || bl.staffId === staff.id)
            .map((bl) => ({ id: bl.id, startTime: bl.startTime, endTime: bl.endTime, reason: bl.reason, type: bl.type, staffId: bl.staffId }));

          const result = generateSlots({
            salonStatus: data.salon.status,
            businessHours: data.salon.businessHours as any,
            closureStart: data.salon.closureStart,
            closureEnd: data.salon.closureEnd,
            date: dateStr,
            serviceDurationMin: 30, // Default 30-min slots for calendar view
            staffSchedule: schedule
              ? { startTime: schedule.startTime, endTime: schedule.endTime, isWorking: schedule.isWorking }
              : null,
            staffUnavailabilities: staffUnavail,
            existingBookings: staffBookings,
            blockedSlots: staffBlocks,
            staffId: staff.id,
          });

          // Only emit AVAILABLE slots (BOOKED/BLOCKED/BREAK/UNAVAILABLE already emitted above)
          for (const slot of result.slots) {
            if (slot.status === 'AVAILABLE') {
              events.push({
                id: `avail-${dateStr}-${staff.id}-${slot.startTime}`,
                type: 'AVAILABLE',
                date: dateStr,
                startTime: slot.startTime,
                endTime: slot.endTime,
                staffId: staff.id,
              });
            }
          }
        }
      }
    }

    // Build summary
    const summary = {
      total: events.length,
      booked: events.filter((e) => e.type === 'BOOKED').length,
      available: events.filter((e) => e.type === 'AVAILABLE').length,
      blocked: events.filter((e) => e.type === 'BLOCKED').length,
      breaks: events.filter((e) => e.type === 'BREAK').length,
      unavailable: events.filter((e) => e.type === 'UNAVAILABLE').length,
      closed: events.filter((e) => e.type === 'CLOSED').length,
    };

    return {
      view: input.view,
      startDate: start,
      endDate: end,
      events,
      summary,
    };
  }
}

export const calendarService = new CalendarService();
