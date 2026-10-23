// ============================================================
// Customers — Repository (data access)
//
// All operations are salon-scoped. Customer records are the salon's
// private view of people who have booked with them — not the customer
// app's user accounts.
// ============================================================

import { prisma } from '../../../database/prisma.js';

export class CustomersRepository {
  async list(salonId: string, filters: {
    search?: string; date?: string; serviceId?: string; staffId?: string; status?: string; sortBy?: string;
  } = {}) {
    // If filtering by booking attributes (service/staff/date/status), we need
    // to find customers who have at least one booking matching the filter.
    if (filters.serviceId || filters.staffId || filters.date || filters.status) {
      const bookingWhere: any = { salonId };
      if (filters.serviceId) bookingWhere.serviceId = filters.serviceId;
      if (filters.staffId) bookingWhere.staffId = filters.staffId;
      if (filters.date) bookingWhere.date = new Date(filters.date + 'T00:00:00Z');
      if (filters.status) bookingWhere.status = filters.status;

      // Find customer IDs that have a matching booking
      const matchingBookings = await prisma.booking.findMany({
        where: bookingWhere,
        select: { customerId: true },
        distinct: ['customerId'],
      });
      const customerIds = matchingBookings.map((b) => b.customerId);
      if (customerIds.length === 0) return [];

      return prisma.customer.findMany({
        where: { salonId, id: { in: customerIds } },
        orderBy: this.sortOrder(filters.sortBy),
      });
    }

    // Simple list with optional search
    return prisma.customer.findMany({
      where: {
        salonId,
        ...(filters.search ? {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search } },
            { email: { contains: filters.search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: this.sortOrder(filters.sortBy),
    });
  }

  private sortOrder(sortBy?: string): any {
    switch (sortBy) {
      case 'recent': return { lastVisitAt: 'desc' };
      case 'spent': return { totalSpentPaise: 'desc' };
      case 'bookings': return { totalBookings: 'desc' };
      default: return { name: 'asc' };
    }
  }

  async findById(salonId: string, id: string) {
    return prisma.customer.findFirst({
      where: { id, salonId },
      include: {
        // Booking history (most recent 50)
        bookings: {
          include: { service: true, staff: true, payment: true },
          orderBy: { date: 'desc' },
          take: 50,
        },
        // Reviews left by this customer
        reviews: {
          include: { service: true, staff: true },
          orderBy: { createdAt: 'desc' },
        },
        // Favorite services
        favoriteServices: {
          include: { service: true },
        },
        // Preferred staff
        preferredStaff: {
          include: { staff: true },
        },
      },
    });
  }

  async create(salonId: string, data: any) {
    const { favoriteServiceIds, preferredStaffIds, ...custData } = data;
    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({ data: { salonId, ...custData } });
      if (favoriteServiceIds?.length) {
        await tx.customerFavoriteService.createMany({
          data: favoriteServiceIds.map((serviceId: string) => ({ customerId: customer.id, serviceId })),
        });
      }
      if (preferredStaffIds?.length) {
        await tx.customerPreferredStaff.createMany({
          data: preferredStaffIds.map((staffId: string) => ({ customerId: customer.id, staffId })),
        });
      }
      return customer;
    });
  }

  async update(salonId: string, id: string, data: any) {
    const { favoriteServiceIds, preferredStaffIds, ...custData } = data;
    return prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findFirst({ where: { id, salonId } });
      if (!existing) return null;
      const customer = await tx.customer.update({ where: { id }, data: custData });
      if (favoriteServiceIds !== undefined) {
        await tx.customerFavoriteService.deleteMany({ where: { customerId: id } });
        if (favoriteServiceIds.length) {
          await tx.customerFavoriteService.createMany({
            data: favoriteServiceIds.map((serviceId: string) => ({ customerId: id, serviceId })),
          });
        }
      }
      if (preferredStaffIds !== undefined) {
        await tx.customerPreferredStaff.deleteMany({ where: { customerId: id } });
        if (preferredStaffIds.length) {
          await tx.customerPreferredStaff.createMany({
            data: preferredStaffIds.map((staffId: string) => ({ customerId: id, staffId })),
          });
        }
      }
      return customer;
    });
  }

  async remove(salonId: string, id: string): Promise<boolean> {
    const existing = await prisma.customer.findFirst({ where: { id, salonId } });
    if (!existing) return false;
    await prisma.customer.delete({ where: { id } });
    return true;
  }

  // --- Customer history (all bookings) ---
  async getHistory(salonId: string, customerId: string) {
    return prisma.booking.findMany({
      where: { salonId, customerId },
      include: { service: true, staff: true, payment: true },
      orderBy: { date: 'desc' },
    });
  }

  // --- Next appointment ---
  async getNextAppointment(salonId: string, customerId: string) {
    const today = new Date().toISOString().split('T')[0];
    return prisma.booking.findFirst({
      where: {
        salonId, customerId,
        date: { gte: new Date(today + 'T00:00:00Z') },
        status: { in: ['PENDING', 'UPCOMING'] },
      },
      include: { service: true, staff: true },
      orderBy: { date: 'asc' },
    });
  }

  // --- Customer insights (calculated from actual booking/payment data) ---

  async getServiceDemand(salonId: string) {
    // Count bookings per service (from actual booking records)
    const bookingsByService = await prisma.booking.groupBy({
      by: ['serviceId'],
      where: { salonId },
      _count: { serviceId: true },
    });
    const serviceIds = bookingsByService.map((b) => b.serviceId);
    const services = await prisma.salonService.findMany({
      where: { id: { in: serviceIds }, salonId },
      select: { id: true, name: true, category: true },
    });
    const serviceMap = new Map(services.map((s) => [s.id, s]));
    return bookingsByService
      .map((b) => {
        const svc = serviceMap.get(b.serviceId);
        return svc ? { serviceId: b.serviceId, serviceName: svc.name, category: svc.category, bookingCount: b._count.serviceId } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b!.bookingCount - a!.bookingCount));
  }

  async getMostFrequentCustomers(salonId: string, limit = 10) {
    return prisma.customer.findMany({
      where: { salonId, totalBookings: { gt: 0 } },
      orderBy: { totalBookings: 'desc' },
      take: limit,
      select: { id: true, name: true, phone: true, totalBookings: true, totalSpentPaise: true, lastVisitAt: true },
    });
  }

  async getRepeatRate(salonId: string) {
    const total = await prisma.customer.count({ where: { salonId } });
    const repeating = await prisma.customer.count({ where: { salonId, completedBookings: { gt: 1 } } });
    return { total, repeating, repeatRate: total > 0 ? Math.round((repeating / total) * 100) : 0 };
  }

  async getAverageSpend(salonId: string) {
    const result = await prisma.customer.aggregate({
      where: { salonId, completedBookings: { gt: 0 } },
      _avg: { totalSpentPaise: true },
      _count: { id: true },
    });
    return {
      averageSpendPaise: result._avg.totalSpentPaise ? Math.round(result._avg.totalSpentPaise) : 0,
      customersWithBookings: result._count.id,
    };
  }

  async getPreferredServicesByCustomer(salonId: string, customerId: string) {
    const favorites = await prisma.customerFavoriteService.findMany({
      where: { customerId, service: { salonId } },
      include: { service: { select: { id: true, name: true, category: true, price: true } } },
    });
    return favorites.map((f) => f.service);
  }
}

export const customersRepository = new CustomersRepository();
