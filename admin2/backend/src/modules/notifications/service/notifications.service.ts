// ============================================================
// Notifications — Service
// ============================================================

import { notificationsRepository } from '../repository/notifications.repository.js';
import { NotFoundError } from '../../../middleware/errorHandler.js';

export class NotificationsService {
  async list(salonId: string, userId: string, filters: any) {
    const items = await notificationsRepository.listForUser(salonId, userId, filters);
    const unreadCount = await notificationsRepository.countUnread(salonId, userId);
    return { items, total: items.length, unreadCount };
  }

  async markRead(salonId: string, userId: string, notificationId: string) {
    const n = await notificationsRepository.markRead(salonId, userId, notificationId);
    if (!n) throw new NotFoundError('Notification not found');
    return n;
  }

  async markAllRead(salonId: string, userId: string) {
    return notificationsRepository.markAllRead(salonId, userId);
  }

  // Internal helper for other modules to create notifications
  async create(salonId: string, data: any) {
    return notificationsRepository.create(salonId, data);
  }
}

export const notificationsService = new NotificationsService();
