// ============================================================
// Reviews — Service (business logic)
// ============================================================

import { reviewsRepository } from '../repository/reviews.repository.js';
import { NotFoundError } from '../../../middleware/errorHandler.js';

export class ReviewsService {
  async list(salonId: string, filters: any) {
    return reviewsRepository.list(salonId, filters);
  }

  async getById(salonId: string, id: string) {
    const r = await reviewsRepository.findById(salonId, id);
    if (!r) throw new NotFoundError('Review not found');
    return r;
  }

  async create(salonId: string, data: any) {
    return reviewsRepository.create(salonId, data);
  }

  async reply(salonId: string, id: string, reply: string, userId: string) {
    const r = await reviewsRepository.reply(salonId, id, reply, userId);
    if (!r) throw new NotFoundError('Review not found');
    return r;
  }

  async getRatingAnalytics(salonId: string) {
    return reviewsRepository.getRatingDistribution(salonId);
  }
}

export const reviewsService = new ReviewsService();
