import { prisma } from './prisma';

export interface AuditParams {
  adminId?: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown> | string;
  ipAddress?: string;
}

export async function recordAuditLog(params: AuditParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        adminId: params.adminId,
        adminEmail: params.adminEmail,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        detailsJson: typeof params.details === 'string' ? params.details : JSON.stringify(params.details || {}),
        ipAddress: params.ipAddress || '127.0.0.1',
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
