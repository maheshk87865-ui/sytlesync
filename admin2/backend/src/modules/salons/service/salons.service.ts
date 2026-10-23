// ============================================================
// Salons — Service (business logic)
// ============================================================

import { salonsRepository } from '../repository/salons.repository.js';
import { NotFoundError, AppError } from '../../../middleware/errorHandler.js';
import { businessHoursSchema, DEFAULT_BUSINESS_HOURS, type BusinessHours } from '../validation/schemas.js';

export class SalonsService {
  async getSalon(salonId: string) {
    const salon = await salonsRepository.findById(salonId);
    if (!salon) throw new NotFoundError('Salon not found');
    return salon;
  }

  async updateSalon(salonId: string, data: any) {
    return salonsRepository.update(salonId, data);
  }

  async setStatus(salonId: string, status: 'OPEN' | 'CLOSED') {
    return salonsRepository.setStatus(salonId, status);
  }

  async setBusinessHours(salonId: string, businessHours: any): Promise<BusinessHours> {
    // Validate the business hours shape server-side (never trust frontend)
    const parsed = businessHoursSchema.safeParse(businessHours);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Invalid business hours', parsed.error.issues);
    }
    await salonsRepository.setBusinessHours(salonId, parsed.data);
    return parsed.data;
  }

  async getBusinessHours(salonId: string): Promise<BusinessHours> {
    const salon = await this.getSalon(salonId);
    return (salon.businessHours as BusinessHours) ?? DEFAULT_BUSINESS_HOURS;
  }

  async setTemporaryClosure(salonId: string, start: Date, end: Date, reason?: string) {
    if (end <= start) throw new AppError('BAD_REQUEST', 'Closure end must be after start');
    return salonsRepository.setTemporaryClosure(salonId, start, end, reason);
  }

  async clearTemporaryClosure(salonId: string) {
    return salonsRepository.clearTemporaryClosure(salonId);
  }
}

export const salonsService = new SalonsService();
