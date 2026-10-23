// ============================================================
// Availability — Repository (data access for the slot engine)
//
// Provides all the data the slot engine needs in a single query batch:
//   - Salon (status, businessHours, closure window)
//   - Staff schedule for the day
//   - Staff unavailability entries for the date
//   - Existing non-cancelled bookings for the staff on the date
//   - Blocked slots + breaks for the date (salon-wide + staff-specific)
// ============================================================

import { prisma } from '../../../database/prisma.js';

export class AvailabilityRepository {
  /**
   * Fetch everything the slot engine needs in parallel.
   * All queries are salon-scoped for security.
   */
  async fetchSlotEngineData(salonId: string, date: string, staffId: string) {
    const dateObj = new Date(date + 'T00:00:00Z');

    const [salon, staff, staffSchedule, staffUnavailabilities, existingBookings, blockedSlots] = await Promise.all([
      // Salon with business hours + closure
      prisma.salon.findUnique({
        where: { id: salonId },
        select: { id: true, status: true, businessHours: true, closureStart: true, closureEnd: true },
      }),
      // Staff (verify they exist + belong to salon + are active)
      prisma.staff.findFirst({
        where: { id: staffId, salonId, status: 'ACTIVE' },
        select: { id: true, name: true },
      }),
      // Staff schedule for this day of week
      prisma.staffSchedule.findUnique({
        where: { staffId_dayOfWeek: { staffId, dayOfWeek: new Date(date + 'T00:00:00').getDay() } },
      }),
      // Staff unavailability for this date
      prisma.staffUnavailability.findMany({
        where: { staffId, date: dateObj },
        select: { id: true, startTime: true, endTime: true, reason: true },
      }),
      // Existing non-cancelled bookings for this staff on this date
      prisma.booking.findMany({
        where: { staffId, date: dateObj, status: { not: 'CANCELLED' } },
        select: { id: true, startTime: true, endTime: true, status: true },
      }),
      // Blocked slots + breaks: salon-wide (staffId=null) OR staff-specific
      prisma.blockedSlot.findMany({
        where: {
          salonId,
          date: dateObj,
          OR: [{ staffId: null }, { staffId }],
        },
        select: { id: true, startTime: true, endTime: true, reason: true, type: true, staffId: true },
      }),
    ]);

    return {
      salon,
      staff,
      staffSchedule,
      staffUnavailabilities: staffUnavailabilities.map((u) => ({
        id: u.id, startTime: u.startTime, endTime: u.endTime, reason: u.reason,
      })),
      existingBookings: existingBookings.map((b) => ({
        id: b.id, startTime: b.startTime, endTime: b.endTime, status: b.status,
      })),
      blockedSlots: blockedSlots.map((bl) => ({
        id: bl.id, startTime: bl.startTime, endTime: bl.endTime, reason: bl.reason, type: bl.type, staffId: bl.staffId,
      })),
    };
  }

  // --- Blocked slots CRUD ---

  async listBlockedSlots(salonId: string, date?: string) {
    return prisma.blockedSlot.findMany({
      where: { salonId, ...(date ? { date: new Date(date + 'T00:00:00Z') } : {}) },
      orderBy: { date: 'desc' },
    });
  }

  async createBlockedSlot(salonId: string, data: {
    date: string; startTime: string; endTime: string; reason?: string;
    type: 'BLOCKED' | 'BREAK'; staffId?: string; createdBy?: string;
  }) {
    return prisma.blockedSlot.create({
      data: {
        salonId,
        staffId: data.staffId || null,
        date: new Date(data.date + 'T00:00:00Z'),
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason || null,
        type: data.type,
        createdBy: data.createdBy || null,
      },
    });
  }

  async removeBlockedSlot(salonId: string, id: string): Promise<boolean> {
    const existing = await prisma.blockedSlot.findFirst({ where: { id, salonId } });
    if (!existing) return false;
    await prisma.blockedSlot.delete({ where: { id } });
    return true;
  }

  /**
   * Check if a booking overlaps with any existing booking for the same staff.
   * Used by the bookings service for conflict detection.
   */
  async findBookingConflict(staffId: string, date: string, startTime: string, endTime: string, excludeBookingId?: string) {
    return prisma.booking.findFirst({
      where: {
        staffId,
        date: new Date(date + 'T00:00:00Z'),
        status: { not: 'CANCELLED' },
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
    });
  }

  /**
   * Check if a booking overlaps with any blocked slot or break.
   */
  async findBlockedSlotConflict(salonId: string, date: string, startTime: string, endTime: string, staffId?: string) {
    return prisma.blockedSlot.findFirst({
      where: {
        salonId,
        date: new Date(date + 'T00:00:00Z'),
        OR: [{ staffId: null }, ...(staffId ? [{ staffId }] : [])],
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
    });
  }

  /**
   * Check if a booking overlaps with any staff unavailability entry.
   */
  async findUnavailabilityConflict(staffId: string, date: string, startTime: string, endTime: string) {
    return prisma.staffUnavailability.findFirst({
      where: {
        staffId,
        date: new Date(date + 'T00:00:00Z'),
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
    });
  }
}

export const availabilityRepository = new AvailabilityRepository();
