// ============================================================
// Services (catalog) — Service (business logic)
//
// Safety:
//   - delete() checks for historical bookings first.
//     If bookings exist → auto-deactivate + return a clear message.
//     If no bookings → hard delete.
//   - Price/duration always come from the DB, never from the frontend.
// ============================================================

import { servicesRepository } from '../repository/services.repository.js';
import { NotFoundError } from '../../../middleware/errorHandler.js';

export class ServicesService {
  async list(salonId: string, includeInactive = false) {
    return servicesRepository.list(salonId, includeInactive);
  }

  async getById(salonId: string, id: string) {
    const service = await servicesRepository.findById(salonId, id);
    if (!service) throw new NotFoundError('Service not found');
    return service;
  }

  async create(salonId: string, data: any) {
    return servicesRepository.create(salonId, data);
  }

  async update(salonId: string, id: string, data: any) {
    const updated = await servicesRepository.update(salonId, id, data);
    if (!updated) throw new NotFoundError('Service not found');
    return updated;
  }

  /**
   * Deactivate a service (soft-delete). The service becomes invisible to
   * customers but historical bookings retain their snapshot data.
   */
  async deactivate(salonId: string, id: string) {
    const service = await servicesRepository.setActive(salonId, id, false);
    if (!service) throw new NotFoundError('Service not found');
    return service;
  }

  /**
   * Reactivate a previously deactivated service.
   */
  async reactivate(salonId: string, id: string) {
    const service = await servicesRepository.setActive(salonId, id, true);
    if (!service) throw new NotFoundError('Service not found');
    return service;
  }

  /**
   * Toggle active/inactive (convenience endpoint).
   */
  async toggleActive(salonId: string, id: string) {
    const service = await servicesRepository.toggleActive(salonId, id);
    if (!service) throw new NotFoundError('Service not found');
    return service;
  }

  /**
   * Safe delete: only hard-deletes if NO bookings reference this service.
   * If bookings exist, auto-deactivates instead and returns a message.
   */
  async remove(salonId: string, id: string): Promise<{ deleted: boolean; deactivated?: boolean; bookingCount?: number; message: string }> {
    const result = await servicesRepository.safeDelete(salonId, id);
    if (result.deleted) {
      return { deleted: true, message: 'Service deleted permanently' };
    }
    if (result.bookingCount && result.bookingCount > 0) {
      // Auto-deactivate instead of hard-delete — historical bookings must be preserved
      await servicesRepository.setActive(salonId, id, false);
      return {
        deleted: false,
        deactivated: true,
        bookingCount: result.bookingCount,
        message: `Service has ${result.bookingCount} historical booking${result.bookingCount !== 1 ? 's' : ''} and was deactivated instead of deleted. Historical booking data is preserved.`,
      };
    }
    // bookingCount === 0 means the service didn't exist
    throw new NotFoundError('Service not found');
  }
}

export const servicesService = new ServicesService();
