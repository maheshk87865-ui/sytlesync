// ============================================================
// Reviews — Repository (data access)
// ============================================================

import { prisma } from '../../../database/prisma.js';

export class ReviewsRepository {
  async list(salonId: string, filters: {
    rating?: string; serviceId?: string; staffId?: string;
    dateFrom?: string; dateTo?: string; hasReply?: string;
  } = {}) {
    const where: any = { salonId };
    if (filters.rating) where.rating = parseInt(filters.rating);
    if (filters.serviceId) where.serviceId = filters.serviceId;
    if (filters.staffId) where.staffId = filters.staffId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom + 'T00:00:00Z');
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59Z');
    }
    if (filters.hasReply === 'true') where.salonReply = { not: null };
    if (filters.hasReply === 'false') where.salonReply = null;

    return prisma.review.findMany({
      where,
      include: { customer: true, service: true, staff: true, booking: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(salonId: string, id: string) {
    return prisma.review.findFirst({
      where: { id, salonId },
      include: { customer: true, service: true, staff: true, booking: true },
    });
  }

  async create(salonId: string, data: any) {
    return prisma.$transaction(async (tx) => {
      const review = await tx.review.create({ data: { salonId, ...data } });
      // Update salon review summary (denormalized)
      const all = await tx.review.aggregate({
        where: { salonId },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await tx.salon.update({
        where: { id: salonId },
        data: {
          rating: all._avg.rating ? Math.round(all._avg.rating * 10) / 10 : 0,
          totalReviews: all._count.rating,
        },
      });
      return review;
    });
  }

  async reply(salonId: string, id: string, reply: string, userId: string) {
    const existing = await prisma.review.findFirst({ where: { id, salonId } });
    if (!existing) return null;
    return prisma.review.update({
      where: { id },
      data: { salonReply: reply, repliedBy: userId, repliedAt: new Date() },
    });
  }

  // --- Rating analytics (calculated from actual review records) ---

  async getRatingDistribution(salonId: string) {
    const [total, avg, five, four, three, two, one] = await Promise.all([
      prisma.review.count({ where: { salonId } }),
      prisma.review.aggregate({ where: { salonId }, _avg: { rating: true } }),
      prisma.review.count({ where: { salonId, rating: 5 } }),
      prisma.review.count({ where: { salonId, rating: 4 } }),
      prisma.review.count({ where: { salonId, rating: 3 } }),
      prisma.review.count({ where: { salonId, rating: 2 } }),
      prisma.review.count({ where: { salonId, rating: 1 } }),
    ]);

    return {
      totalReviews: total,
      averageRating: avg._avg.rating ? Math.round(avg._avg.rating * 10) / 10 : 0,
      distribution: {
        '5': five,
        '4': four,
        '3': three,
        '2': two,
        '1': one,
      },
      // Convenience: percentages
      distributionPercent: {
        '5': total > 0 ? Math.round((five / total) * 100) : 0,
        '4': total > 0 ? Math.round((four / total) * 100) : 0,
        '3': total > 0 ? Math.round((three / total) * 100) : 0,
        '2': total > 0 ? Math.round((two / total) * 100) : 0,
        '1': total > 0 ? Math.round((one / total) * 100) : 0,
      },
    };
  }
}

export const reviewsRepository = new ReviewsRepository();
