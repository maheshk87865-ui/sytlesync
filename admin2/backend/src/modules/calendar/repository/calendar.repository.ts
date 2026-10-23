// ============================================================
// Calendar — Repository (data access for calendar views)
//
// Fetches all the data the calendar needs for a date range:
//   - Bookings (with customer, service, staff, payment relations)
//   - Blocked slots + breaks (salon-wide + staff-specific)
//   - Staff schedules (weekly recurring)
//   - Staff unavailabilities (date-specific time-off)
//   - Salon (for business hours + status + closure)
//
// All queries are salon-scoped.
// ============================================================

import { prisma } from '../../../database/prisma.js';

export class CalendarRepository {
  /**
   * Fetch all calendar data for a date range in a single batch.
   */
  async getRangeData(salonId: string, startDate: string, endDate: string, staffId?: string) {
    const startDateObj = new Date(startDate + 'T00:00:00Z');
    const endDateObj = new Date(endDate + 'T23:59:59Z');

    const [salon, bookings, blockedSlots, staffList, staffUnavailabilities] = await Promise.all([
      // Salon (business hours, status, closure)
      prisma.salon.findUnique({
        where: { id: salonId },
        select: { id: true, name: true, status: true, businessHours: true, closureStart: true, closureEnd: true },
      }),
      // Bookings in the range
      prisma.booking.findMany({
        where: {
          salonId,
          date: { gte: startDateObj, lte: endDateObj },
          ...(staffId ? { staffId } : {}),
        },
        include: { customer: true, service: true, staff: true, payment: true },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      }),
      // Blocked slots + breaks in the range
      prisma.blockedSlot.findMany({
        where: {
          salonId,
          date: { gte: startDateObj, lte: endDateObj },
          OR: [{ staffId: null }, ...(staffId ? [{ staffId }] : [])],
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      }),
      // Staff (active only — for schedule + available-slot calculations)
      prisma.staff.findMany({
        where: { salonId, status: 'ACTIVE', ...(staffId ? { id: staffId } : {}) },
        include: { schedules: { orderBy: { dayOfWeek: 'asc' } } },
      }),
      // Staff unavailabilities in the range
      prisma.staffUnavailability.findMany({
        where: {
          staff: { salonId },
          date: { gte: startDateObj, lte: endDateObj },
          ...(staffId ? { staffId } : {}),
        },
        include: { staff: { select: { id: true, name: true } } },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      }),
    ]);

    return { salon, bookings, blockedSlots, staffList, staffUnavailabilities };
  }
}

export const calendarRepository = new CalendarRepository();
