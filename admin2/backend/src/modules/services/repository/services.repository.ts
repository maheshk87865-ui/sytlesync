// ============================================================
// Services (catalog) — Repository (data access)
//
// Safety rules:
//   - A service can be HARD-DELETED only if it has NO bookings referencing it.
//   - If a service has historical bookings, it must be DEACTIVATED (soft-delete)
//     instead — the Booking model uses onDelete: Restrict so Prisma itself
//     prevents the delete, but we check first for a cleaner error message.
// ============================================================

import { prisma } from '../../../database/prisma.js';
import type { SalonService } from '@prisma/client';

export class ServicesRepository {
  async list(salonId: string, includeInactive = false) {
    return prisma.salonService.findMany({
      where: includeInactive ? { salonId } : { salonId, active: true },
      include: { staff: { include: { staff: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(salonId: string, id: string) {
    return prisma.salonService.findFirst({ where: { id, salonId }, include: { staff: { include: { staff: true } } } });
  }

  async countBookings(serviceId: string): Promise<number> {
    return prisma.booking.count({ where: { serviceId } });
  }

  async create(salonId: string, data: any): Promise<SalonService> {
    const { staffIds, ...serviceData } = data;
    return prisma.$transaction(async (tx) => {
      const service = await tx.salonService.create({ data: { salonId, ...serviceData } });
      if (staffIds?.length) {
        await tx.staffService.createMany({ data: staffIds.map((staffId: string) => ({ staffId, serviceId: service.id })) });
      }
      return service;
    });
  }

  async update(salonId: string, id: string, data: any): Promise<SalonService | null> {
    const { staffIds, ...serviceData } = data;
    return prisma.$transaction(async (tx) => {
      const existing = await tx.salonService.findFirst({ where: { id, salonId } });
      if (!existing) return null;
      const service = await tx.salonService.update({ where: { id }, data: serviceData });
      if (staffIds !== undefined) {
        await tx.staffService.deleteMany({ where: { serviceId: id } });
        if (staffIds.length) {
          await tx.staffService.createMany({ data: staffIds.map((staffId: string) => ({ staffId, serviceId: id })) });
        }
      }
      return service;
    });
  }

  /**
   * Safe delete: only deletes if NO bookings reference this service.
   * If bookings exist, the caller should deactivate instead.
   * Returns { deleted: true } on success, { deleted: false, bookingCount } if unsafe.
   */
  async safeDelete(salonId: string, id: string): Promise<{ deleted: boolean; bookingCount?: number }> {
    const existing = await prisma.salonService.findFirst({ where: { id, salonId } });
    if (!existing) return { deleted: false, bookingCount: 0 };

    const bookingCount = await this.countBookings(id);
    if (bookingCount > 0) {
      return { deleted: false, bookingCount };
    }

    // No bookings → safe to hard delete (also removes StaffService join rows via cascade)
    await prisma.salonService.delete({ where: { id } });
    return { deleted: true };
  }

  async setActive(salonId: string, id: string, active: boolean): Promise<SalonService | null> {
    const existing = await prisma.salonService.findFirst({ where: { id, salonId } });
    if (!existing) return null;
    return prisma.salonService.update({ where: { id }, data: { active } });
  }

  async toggleActive(salonId: string, id: string): Promise<SalonService | null> {
    const existing = await prisma.salonService.findFirst({ where: { id, salonId } });
    if (!existing) return null;
    return prisma.salonService.update({ where: { id }, data: { active: !existing.active } });
  }
}

export const servicesRepository = new ServicesRepository();
