// ============================================================
// Notifications — Repository (data access)
//
// All queries are salon-scoped AND user-scoped:
//   - A user sees notifications targeting their salon (userId = null = all)
//   - OR notifications targeting them specifically (userId = their id)
// ============================================================

import { prisma } from '../../../database/prisma.js';

export class NotificationsRepository {
  /**
   * List notifications for a salon user.
   * Returns notifications where:
   *   - salonId matches the user's salon, AND
   *   - (userId is null → broadcast to all, OR userId matches this user)
   */
  async listForUser(salonId: string, userId: string, filters: { unreadOnly?: boolean; type?: string } = {}) {
    const where: any = {
      salonId,
      OR: [{ userId: null }, { userId }],
    };
    if (filters.unreadOnly === true) where.read = false;
    if (filters.type) where.type = filters.type;

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Count unread notifications for a user.
   */
  async countUnread(salonId: string, userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        salonId,
        read: false,
        OR: [{ userId: null }, { userId }],
      },
    });
  }

  /**
   * Mark a single notification as read.
   * Verifies the notification belongs to the user's salon AND is targeted to them.
   */
  async markRead(salonId: string, userId: string, notificationId: string) {
    const existing = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        salonId,
        OR: [{ userId: null }, { userId }],
      },
    });
    if (!existing) return null;
    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllRead(salonId: string, userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        salonId,
        read: false,
        OR: [{ userId: null }, { userId }],
      },
      data: { read: true },
    });
    return { updated: result.count };
  }

  /**
   * Create a notification (used internally by other modules).
   */
  async create(salonId: string, data: {
    type: string; title: string; message: string;
    userId?: string; metadata?: any; linkType?: string; linkId?: string;
  }) {
    return prisma.notification.create({
      data: {
        salonId,
        type: data.type as any,
        title: data.title,
        message: data.message,
        userId: data.userId || null,
        metadata: data.metadata || null,
        linkType: data.linkType || null,
        linkId: data.linkId || null,
      },
    });
  }
}

export const notificationsRepository = new NotificationsRepository();
