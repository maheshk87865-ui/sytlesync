// ============================================================
// Staff — Repository (data access)
// All operations are salon-scoped.
// ============================================================

import { prisma } from '../../../database/prisma.js';
import type { Staff } from '@prisma/client';

export class StaffRepository {
  async list(salonId: string, includeRelations = false) {
    return prisma.staff.findMany({
      where: { salonId },
      include: includeRelations
        ? { services: { include: { service: true } }, schedules: true, unavailabilities: true }
        : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findById(salonId: string, id: string) {
    return prisma.staff.findFirst({
      where: { id, salonId },
      include: {
        services: { include: { service: true } },
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        unavailabilities: { orderBy: { date: 'desc' } },
      },
    });
  }

  async create(salonId: string, data: any): Promise<Staff> {
    const { serviceIds, schedule, ...staffData } = data;
    return prisma.$transaction(async (tx) => {
      const staff = await tx.staff.create({ data: { salonId, ...staffData } });
      if (serviceIds?.length) {
        await tx.staffService.createMany({ data: serviceIds.map((serviceId: string) => ({ staffId: staff.id, serviceId })) });
      }
      if (schedule?.length) {
        await tx.staffSchedule.createMany({ data: schedule.map((s: any) => ({ salonId, staffId: staff.id, ...s })) });
      }
      return staff;
    });
  }

  async update(salonId: string, id: string, data: any): Promise<Staff | null> {
    const { serviceIds, schedule, ...staffData } = data;
    return prisma.$transaction(async (tx) => {
      const existing = await tx.staff.findFirst({ where: { id, salonId } });
      if (!existing) return null;
      const staff = await tx.staff.update({ where: { id }, data: staffData });
      if (serviceIds !== undefined) {
        await tx.staffService.deleteMany({ where: { staffId: id } });
        if (serviceIds.length) {
          await tx.staffService.createMany({ data: serviceIds.map((serviceId: string) => ({ staffId: id, serviceId })) });
        }
      }
      if (schedule !== undefined) {
        await tx.staffSchedule.deleteMany({ where: { staffId: id } });
        if (schedule.length) {
          await tx.staffSchedule.createMany({ data: schedule.map((s: any) => ({ salonId, staffId: id, ...s })) });
        }
      }
      return staff;
    });
  }

  async remove(salonId: string, id: string): Promise<boolean> {
    const existing = await prisma.staff.findFirst({ where: { id, salonId } });
    if (!existing) return false;
    await prisma.staff.delete({ where: { id } });
    return true;
  }

  // --- Service assignments ---

  async setServices(salonId: string, staffId: string, serviceIds: string[]): Promise<void> {
    // Verify the staff belongs to the salon (defensive — the route guard already checks)
    const existing = await prisma.staff.findFirst({ where: { id: staffId, salonId } });
    if (!existing) throw new Error('Staff not found');

    await prisma.$transaction(async (tx) => {
      await tx.staffService.deleteMany({ where: { staffId } });
      if (serviceIds.length) {
        // Verify all services belong to the same salon before assigning
        const validServices = await tx.salonService.findMany({
          where: { id: { in: serviceIds }, salonId },
          select: { id: true },
        });
        const validIds = validServices.map((s) => s.id);
        if (validIds.length !== serviceIds.length) {
          throw new Error('One or more services do not belong to this salon');
        }
        await tx.staffService.createMany({ data: validIds.map((serviceId: string) => ({ staffId, serviceId })) });
      }
    });
  }

  async listStaffServices(salonId: string, staffId: string) {
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, salonId },
      include: { services: { include: { service: true } } },
    });
    if (!staff) return null;
    return staff.services.map((s) => s.service);
  }

  // --- Schedule ---

  async setSchedule(salonId: string, staffId: string, schedule: any[]): Promise<void> {
    const existing = await prisma.staff.findFirst({ where: { id: staffId, salonId } });
    if (!existing) throw new Error('Staff not found');

    await prisma.$transaction(async (tx) => {
      await tx.staffSchedule.deleteMany({ where: { staffId } });
      if (schedule.length) {
        await tx.staffSchedule.createMany({
          data: schedule.map((s: any) => ({
            salonId,
            staffId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.isWorking ? s.startTime : null,
            endTime: s.isWorking ? s.endTime : null,
            isWorking: s.isWorking,
          })),
        });
      }
    });
  }

  async getSchedule(salonId: string, staffId: string) {
    return prisma.staffSchedule.findMany({
      where: { salonId, staffId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  // --- Unavailability (temporary time-off) ---

  async addUnavailability(staffId: string, date: Date, startTime: string, endTime: string, reason?: string) {
    return prisma.staffUnavailability.create({ data: { staffId, date, startTime, endTime, reason } });
  }

  async listUnavailabilities(salonId: string, staffId: string) {
    return prisma.staffUnavailability.findMany({
      where: { staffId, staff: { salonId } },
      orderBy: { date: 'desc' },
    });
  }

  async removeUnavailability(staffId: string, unavailabilityId: string): Promise<boolean> {
    const existing = await prisma.staffUnavailability.findFirst({ where: { id: unavailabilityId, staffId } });
    if (!existing) return false;
    await prisma.staffUnavailability.delete({ where: { id: unavailabilityId } });
    return true;
  }
}

export const staffRepository = new StaffRepository();
