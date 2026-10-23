// ============================================================
// Audit — Repository
// ============================================================

import { prisma } from '../../../database/prisma.js';

export class AuditRepository {
  async list(salonId: string, filters: any = {}) {
    const where: any = { salonId };
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom + 'T00:00:00Z');
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59Z');
    }
    return prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async create(input: {
    salonId: string; userId?: string; action: string;
    entityType?: string; entityId?: string; metadata?: any; ipAddress?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        salonId: input.salonId,
        userId: input.userId || null,
        action: input.action,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
        metadata: input.metadata || null,
        ipAddress: input.ipAddress || null,
      },
    });
  }
}

export const auditRepository = new AuditRepository();
