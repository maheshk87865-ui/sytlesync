// ============================================================
// Staff — Service (business logic)
// ============================================================

import { staffRepository } from '../repository/staff.repository.js';
import { NotFoundError } from '../../../middleware/errorHandler.js';

export class StaffService {
  async list(salonId: string) {
    return staffRepository.list(salonId, true);
  }

  async getById(salonId: string, id: string) {
    const staff = await staffRepository.findById(salonId, id);
    if (!staff) throw new NotFoundError('Staff member not found');
    return staff;
  }

  async create(salonId: string, data: any) {
    return staffRepository.create(salonId, data);
  }

  async update(salonId: string, id: string, data: any) {
    const updated = await staffRepository.update(salonId, id, data);
    if (!updated) throw new NotFoundError('Staff member not found');
    return updated;
  }

  async remove(salonId: string, id: string) {
    const ok = await staffRepository.remove(salonId, id);
    if (!ok) throw new NotFoundError('Staff member not found');
  }

  // --- Service assignments ---

  async setServices(salonId: string, staffId: string, serviceIds: string[]) {
    await this.getById(salonId, staffId); // Verify staff exists in this salon
    await staffRepository.setServices(salonId, staffId, serviceIds);
    return staffRepository.listStaffServices(salonId, staffId);
  }

  async listStaffServices(salonId: string, staffId: string) {
    await this.getById(salonId, staffId);
    return staffRepository.listStaffServices(salonId, staffId);
  }

  // --- Schedule ---

  async setSchedule(salonId: string, staffId: string, schedule: any[]) {
    await this.getById(salonId, staffId);
    await staffRepository.setSchedule(salonId, staffId, schedule);
    return staffRepository.getSchedule(salonId, staffId);
  }

  async getSchedule(salonId: string, staffId: string) {
    await this.getById(salonId, staffId);
    return staffRepository.getSchedule(salonId, staffId);
  }

  // --- Unavailability (temporary time-off) ---

  async addUnavailability(salonId: string, staffId: string, date: string, startTime: string, endTime: string, reason?: string) {
    await this.getById(salonId, staffId);
    return staffRepository.addUnavailability(staffId, new Date(date + 'T00:00:00Z'), startTime, endTime, reason);
  }

  async listUnavailabilities(salonId: string, staffId: string) {
    await this.getById(salonId, staffId);
    return staffRepository.listUnavailabilities(salonId, staffId);
  }

  async removeUnavailability(salonId: string, staffId: string, unavailabilityId: string) {
    await this.getById(salonId, staffId);
    const ok = await staffRepository.removeUnavailability(staffId, unavailabilityId);
    if (!ok) throw new NotFoundError('Unavailability entry not found');
  }
}

export const staffService = new StaffService();
