// ============================================================
// Bookings — Service (business logic with conflict prevention)
//
// All validation happens server-side. Price/duration/name always come
// from the database — never from the frontend.
// ============================================================

import { bookingsRepository } from '../repository/bookings.repository.js';
import { prisma } from '../../../database/prisma.js';
import { NotFoundError, AppError } from '../../../middleware/errorHandler.js';
import { checkSalonOpen } from '../../../utils/businessHours.js';
import type { CreateBookingInput } from '../validation/schemas.js';

function addMins(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay();
}

// Valid status transitions — enforced server-side
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['UPCOMING', 'COMPLETED', 'CANCELLED'],
  UPCOMING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export class BookingsService {
  async list(salonId: string, filters: Record<string, string | undefined>) {
    return bookingsRepository.list(salonId, filters as any);
  }

  async getById(salonId: string, id: string) {
    const booking = await bookingsRepository.findById(salonId, id);
    if (!booking) throw new NotFoundError('Booking not found');
    return booking;
  }

  async create(salonId: string, input: CreateBookingInput) {
    // --- 1. Validate salon ---
    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) throw new NotFoundError('Salon not found');

    // --- 2. Validate service (exists + active + belongs to salon) ---
    const service = await prisma.salonService.findFirst({
      where: { id: input.serviceId, salonId, active: true },
    });
    if (!service) throw new NotFoundError('Service not found or inactive');

    // --- 3. Validate staff (exists + active + belongs to salon) ---
    const staff = await prisma.staff.findFirst({
      where: { id: input.staffId, salonId, status: 'ACTIVE' },
    });
    if (!staff) throw new NotFoundError('Staff member not found or inactive');

    // --- 4. Staff must be assigned to this service ---
    const staffService = await prisma.staffService.findUnique({
      where: { staffId_serviceId: { staffId: input.staffId, serviceId: input.serviceId } },
    });
    if (!staffService) throw new AppError('STAFF_UNAVAILABLE', `${staff.name} is not assigned to ${service.name}`);

    // --- 5. Calculate end time from DB service duration (never frontend) ---
    const endTime = addMins(input.startTime, service.durationMin);

    // --- 6. Check salon business hours + status + temporary closure ---
    const salonOpenCheck = checkSalonOpen({
      salonStatus: salon.status,
      businessHours: salon.businessHours as any,
      date: input.date,
      startTime: input.startTime,
      endTime,
      closureStart: salon.closureStart,
      closureEnd: salon.closureEnd,
    });
    if (!salonOpenCheck.open) {
      throw new AppError('SALON_CLOSED', salonOpenCheck.reason || 'Salon is closed for this time');
    }

    // --- 7. Check staff schedule for this day ---
    const dayKey = getDayOfWeek(input.date);
    const schedule = await prisma.staffSchedule.findUnique({
      where: { staffId_dayOfWeek: { staffId: input.staffId, dayOfWeek: dayKey } },
    });
    if (!schedule || !schedule.isWorking || !schedule.startTime || !schedule.endTime) {
      throw new AppError('STAFF_UNAVAILABLE', `${staff.name} is off on this day`);
    }
    if (input.startTime < schedule.startTime || endTime > schedule.endTime) {
      throw new AppError('STAFF_UNAVAILABLE', `${staff.name} works ${schedule.startTime} - ${schedule.endTime}`);
    }

    // --- 8. Check staff unavailability (temporary time-off) ---
    const unavail = await bookingsRepository.findStaffUnavailability(input.staffId, input.date, input.startTime, endTime);
    if (unavail) {
      throw new AppError('STAFF_UNAVAILABLE', `${staff.name} is unavailable ${unavail.startTime} - ${unavail.endTime} (${unavail.reason || 'time off'})`);
    }

    // --- 9. Check for double-booking (server-side overlap) ---
    const conflict = await prisma.booking.findFirst({
      where: {
        staffId: input.staffId,
        date: new Date(input.date + 'T00:00:00Z'),
        status: { not: 'CANCELLED' },
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: input.startTime } },
        ],
      },
    });
    if (conflict) {
      throw new AppError('BOOKING_CONFLICT', `${staff.name} is already booked ${conflict.startTime} - ${conflict.endTime}`);
    }

    // --- 10. Check blocked slots / breaks ---
    const blocked = await bookingsRepository.findBlockedSlotConflict(salonId, input.date, input.startTime, endTime, input.staffId);
    if (blocked) {
      const code = blocked.type === 'BREAK' ? 'SLOT_BREAK' : 'SLOT_BLOCKED';
      throw new AppError(code, `This time is ${blocked.type === 'BREAK' ? 'a break' : 'blocked'}: ${blocked.reason || 'unavailable'}`);
    }

    // --- 11. Find or create the customer ---
    let customerId = input.customerId;
    if (!customerId) {
      const existing = await prisma.customer.findUnique({
        where: { salonId_phone: { salonId, phone: input.customerPhone } },
      });
      if (existing) {
        customerId = existing.id;
      } else {
        const newCust = await prisma.customer.create({
          data: {
            salonId,
            name: input.customerName,
            phone: input.customerPhone,
            email: input.customerEmail,
            imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(input.customerName)}&background=0D5C4B&color=fff`,
          },
        });
        customerId = newCust.id;
      }
    } else {
      // Verify the customer belongs to this salon
      const cust = await prisma.customer.findFirst({ where: { id: customerId, salonId } });
      if (!cust) throw new NotFoundError('Customer not found');
    }

    // --- 12. Create the booking with DB-sourced snapshots ---
    // Price, duration, and names come from the DB — never from the frontend.
    // The repository's create() method runs inside a transaction and re-checks
    // for conflicts to prevent double-booking under concurrency.
    return bookingsRepository.create({
      salonId,
      customerId,
      serviceId: input.serviceId,
      staffId: input.staffId,
      date: new Date(input.date + 'T00:00:00Z'),
      startTime: input.startTime,
      endTime,
      durationMin: service.durationMin,     // ← from DB
      pricePaise: service.price,             // ← from DB
      customerName: input.customerName,
      customerPhone: input.customerPhone,    // ← snapshot
      serviceName: service.name,            // ← snapshot from DB
      staffName: staff.name,                 // ← snapshot from DB
      status: 'PENDING',
      paymentStatus: input.paymentStatus || 'PENDING',
      notes: input.notes,
    });
  }

  /**
   * Update booking status — enforces valid transitions only.
   * PENDING → UPCOMING, COMPLETED, CANCELLED
   * UPCOMING → COMPLETED, CANCELLED
   * COMPLETED → (no transitions)
   * CANCELLED → (no transitions)
   */
  async updateStatus(salonId: string, id: string, status: string, reason?: string) {
    const existing = await bookingsRepository.findById(salonId, id);
    if (!existing) throw new NotFoundError('Booking not found');

    // Enforce valid transitions
    if (!VALID_TRANSITIONS[existing.status]?.includes(status)) {
      throw new AppError('INVALID_STATUS_TRANSITION',
        `Cannot change status from ${existing.status} to ${status}. Allowed: ${VALID_TRANSITIONS[existing.status].join(', ') || 'none'}`
      );
    }

    return bookingsRepository.updateStatus(salonId, id, status, reason);
  }

  /**
   * Complete a booking — convenience endpoint for POST /:id/complete
   */
  async complete(salonId: string, id: string) {
    return this.updateStatus(salonId, id, 'COMPLETED');
  }

  /**
   * Cancel a booking — requires a reason
   */
  async cancel(salonId: string, id: string, reason: string) {
    return this.updateStatus(salonId, id, 'CANCELLED', reason);
  }

  /**
   * Reschedule a booking — re-checks ALL availability rules for the new date/time.
   * The server re-validates: salon hours, staff schedule, unavailability, conflicts,
   * and blocked slots. Does NOT simply edit the booking.
   */
  async reschedule(salonId: string, id: string, date: string, startTime: string) {
    const existing = await bookingsRepository.findById(salonId, id);
    if (!existing) throw new NotFoundError('Booking not found');

    // Can only reschedule non-completed, non-cancelled bookings
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new AppError('INVALID_STATUS_TRANSITION', `Cannot reschedule a ${existing.status} booking`);
    }

    // Recompute end time from the original service duration (snapshot)
    const endTime = addMins(startTime, existing.durationMin);

    // Re-check salon hours
    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) throw new NotFoundError('Salon not found');
    const salonOpenCheck = checkSalonOpen({
      salonStatus: salon.status,
      businessHours: salon.businessHours as any,
      date,
      startTime,
      endTime,
      closureStart: salon.closureStart,
      closureEnd: salon.closureEnd,
    });
    if (!salonOpenCheck.open) {
      throw new AppError('SALON_CLOSED', salonOpenCheck.reason || 'Salon is closed for this time');
    }

    // Re-check staff schedule
    const dayKey = getDayOfWeek(date);
    const schedule = await prisma.staffSchedule.findUnique({
      where: { staffId_dayOfWeek: { staffId: existing.staffId, dayOfWeek: dayKey } },
    });
    if (!schedule || !schedule.isWorking || !schedule.startTime || !schedule.endTime) {
      throw new AppError('STAFF_UNAVAILABLE', `${existing.staffName} is off on this day`);
    }
    if (startTime < schedule.startTime || endTime > schedule.endTime) {
      throw new AppError('STAFF_UNAVAILABLE', `${existing.staffName} works ${schedule.startTime} - ${schedule.endTime}`);
    }

    // Re-check staff unavailability
    const unavail = await bookingsRepository.findStaffUnavailability(existing.staffId, date, startTime, endTime);
    if (unavail) {
      throw new AppError('STAFF_UNAVAILABLE', `${existing.staffName} is unavailable ${unavail.startTime} - ${unavail.endTime}`);
    }

    // Re-check blocked slots
    const blocked = await bookingsRepository.findBlockedSlotConflict(salonId, date, startTime, endTime, existing.staffId);
    if (blocked) {
      const code = blocked.type === 'BREAK' ? 'SLOT_BREAK' : 'SLOT_BLOCKED';
      throw new AppError(code, `This time is ${blocked.type === 'BREAK' ? 'a break' : 'blocked'}: ${blocked.reason || 'unavailable'}`);
    }

    // Re-check for conflicts (inside a transaction — the repository handles this)
    const result = await bookingsRepository.reschedule(salonId, id, date, startTime, endTime);
    if (!result) throw new NotFoundError('Booking not found');
    return result;
  }
}

export const bookingsService = new BookingsService();
