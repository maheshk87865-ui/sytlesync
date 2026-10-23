// ============================================================
// Salons — Repository (data access)
// ============================================================

import { prisma } from '../../../database/prisma.js';
import type { Salon } from '@prisma/client';

export class SalonsRepository {
  async findById(id: string): Promise<Salon | null> {
    return prisma.salon.findUnique({ where: { id } });
  }

  async update(id: string, data: Record<string, unknown>): Promise<Salon> {
    return prisma.salon.update({ where: { id }, data: data as any });
  }

  async setStatus(id: string, status: 'OPEN' | 'CLOSED'): Promise<Salon> {
    return prisma.salon.update({ where: { id }, data: { status } });
  }

  async setBusinessHours(id: string, businessHours: any): Promise<Salon> {
    return prisma.salon.update({ where: { id }, data: { businessHours } });
  }

  async setTemporaryClosure(id: string, start: Date, end: Date, reason?: string): Promise<Salon> {
    return prisma.salon.update({
      where: { id },
      data: { closureStart: start, closureEnd: end, closureReason: reason },
    });
  }

  async clearTemporaryClosure(id: string): Promise<Salon> {
    return prisma.salon.update({
      where: { id },
      data: { closureStart: null, closureEnd: null, closureReason: null },
    });
  }
}

export const salonsRepository = new SalonsRepository();
