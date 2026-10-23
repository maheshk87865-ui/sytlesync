// ============================================================
// Support — Service
// ============================================================

import { supportRepository } from '../repository/support.repository.js';
import { NotFoundError } from '../../../middleware/errorHandler.js';

export class SupportService {
  async list(salonId: string) {
    return supportRepository.list(salonId);
  }

  async getById(salonId: string, id: string) {
    const t = await supportRepository.findById(salonId, id);
    if (!t) throw new NotFoundError('Ticket not found');
    return t;
  }

  async create(salonId: string, createdBy: string, data: any) {
    return supportRepository.create(salonId, createdBy, data);
  }

  async respond(salonId: string, ticketId: string, message: string) {
    const r = await supportRepository.respond(salonId, ticketId, message);
    if (!r) throw new NotFoundError('Ticket not found');
    return r;
  }

  async updateStatus(salonId: string, ticketId: string, status: string) {
    const t = await supportRepository.updateStatus(salonId, ticketId, status);
    if (!t) throw new NotFoundError('Ticket not found');
    return t;
  }
}

export const supportService = new SupportService();
