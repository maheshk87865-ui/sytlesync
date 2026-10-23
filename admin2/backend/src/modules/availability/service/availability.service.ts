// ============================================================
// Availability — Service (orchestrates the slot engine)
//
// This is the ONE place that calls the slot engine. Other modules
// (bookings, calendar) can import the service or the engine directly.
// ============================================================

import { availabilityRepository } from '../repository/availability.repository.js';
import { generateSlots } from '../../../utils/slotEngine.js';
import { NotFoundError } from '../../../middleware/errorHandler.js';
import { prisma } from '../../../database/prisma.js';

export class AvailabilityService {
  /**
   * Get calculated slots for a date + staff + service.
   *
   * The service duration comes from the DB (never the frontend).
   * If no serviceId is provided, defaults to 30-minute slots.
   */
  async getSlots(salonId: string, date: string, staffId?: string, serviceId?: string) {
    // If serviceId is provided, we need its duration from the DB
    let serviceDurationMin = 30; // default slot length
    if (serviceId) {
      const service = await prisma.salonService.findFirst({
        where: { id: serviceId, salonId, active: true },
        select: { durationMin: true, name: true },
      });
      if (!service) throw new NotFoundError('Service not found or inactive');
      serviceDurationMin = service.durationMin;
    }

    // If no staffId, we need to return slots for all active staff
    if (!staffId) {
      // Get all active staff for this salon
      const allStaff = await prisma.staff.findMany({
        where: { salonId, status: 'ACTIVE' },
        select: { id: true, name: true },
      });

      const results = await Promise.all(
        allStaff.map(async (staff) => {
          const data = await availabilityRepository.fetchSlotEngineData(salonId, date, staff.id);
          if (!data.salon) throw new NotFoundError('Salon not found');
          if (!data.staff) return { staffId: staff.id, staffName: staff.name, slots: [], open: false, reason: 'Staff not found' };

          const result = generateSlots({
            salonStatus: data.salon.status,
            businessHours: data.salon.businessHours as any,
            closureStart: data.salon.closureStart,
            closureEnd: data.salon.closureEnd,
            date,
            serviceDurationMin,
            staffSchedule: data.staffSchedule
              ? { startTime: data.staffSchedule.startTime, endTime: data.staffSchedule.endTime, isWorking: data.staffSchedule.isWorking }
              : null,
            staffUnavailabilities: data.staffUnavailabilities,
            existingBookings: data.existingBookings,
            blockedSlots: data.blockedSlots,
            staffId: staff.id,
          });

          return { staffId: staff.id, staffName: staff.name, slots: result.slots, open: result.open, reason: result.reason };
        }),
      );

      return { mode: 'all-staff', staff: results };
    }

    // Single staff
    const data = await availabilityRepository.fetchSlotEngineData(salonId, date, staffId);
    if (!data.salon) throw new NotFoundError('Salon not found');
    if (!data.staff) throw new NotFoundError('Staff member not found');

    const result = generateSlots({
      salonStatus: data.salon.status,
      businessHours: data.salon.businessHours as any,
      closureStart: data.salon.closureStart,
      closureEnd: data.salon.closureEnd,
      date,
      serviceDurationMin,
      staffSchedule: data.staffSchedule
        ? { startTime: data.staffSchedule.startTime, endTime: data.staffSchedule.endTime, isWorking: data.staffSchedule.isWorking }
        : null,
      staffUnavailabilities: data.staffUnavailabilities,
      existingBookings: data.existingBookings,
      blockedSlots: data.blockedSlots,
      staffId,
    });

    return {
      mode: 'single-staff',
      staffId,
      staffName: data.staff.name,
      slots: result.slots,
      open: result.open,
      reason: result.reason,
    };
  }

  // --- Block slot ---

  async createBlock(salonId: string, userId: string | undefined, data: {
    date: string; startTime: string; endTime: string; reason?: string; type: 'BLOCKED' | 'BREAK'; staffId?: string;
  }) {
    // If staffId is provided, verify the staff belongs to this salon
    if (data.staffId) {
      const staff = await prisma.staff.findFirst({ where: { id: data.staffId, salonId } });
      if (!staff) throw new NotFoundError('Staff member not found');
    }

    return availabilityRepository.createBlockedSlot(salonId, {
      ...data,
      createdBy: userId,
    });
  }

  async removeBlock(salonId: string, id: string) {
    const ok = await availabilityRepository.removeBlockedSlot(salonId, id);
    if (!ok) throw new NotFoundError('Blocked slot not found');
  }

  async listBlocks(salonId: string, date?: string) {
    return availabilityRepository.listBlockedSlots(salonId, date);
  }
}

export const availabilityService = new AvailabilityService();
