// ============================================================
// Analytics — Repository (all calculations from real DB data)
//
// Every number returned by this repository is the result of a
// Prisma query (count, aggregate, groupBy). Nothing is hardcoded.
// ============================================================

import { prisma } from '../../../database/prisma.js';

// --- Date range helpers ---

function getRangeBounds(range: string, custom?: { dateFrom?: string; dateTo?: string }): { start: string; end: string; label: string } {
  const today = new Date().toISOString().split('T')[0];
  const d = new Date(today + 'T00:00:00');

  if (range === 'CUSTOM' && custom?.dateFrom && custom?.dateTo) {
    return { start: custom.dateFrom, end: custom.dateTo, label: 'Custom' };
  }
  if (range === 'TODAY') return { start: today, end: today, label: 'Today' };
  if (range === 'YESTERDAY') {
    const y = new Date(d); y.setDate(d.getDate() - 1);
    const yStr = y.toISOString().split('T')[0];
    return { start: yStr, end: yStr, label: 'Yesterday' };
  }
  if (range === '7D') {
    const start = new Date(d); start.setDate(d.getDate() - 6);
    return { start: start.toISOString().split('T')[0], end: today, label: '7 Days' };
  }
  if (range === '30D') {
    const start = new Date(d); start.setDate(d.getDate() - 29);
    return { start: start.toISOString().split('T')[0], end: today, label: '30 Days' };
  }
  if (range === 'MONTH') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0], label: 'This Month' };
  }
  if (range === 'LAST_MONTH') {
    const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const end = new Date(d.getFullYear(), d.getMonth(), 0);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0], label: 'Last Month' };
  }
  return { start: '2000-01-01', end: today, label: 'All Time' };
}

function dateFilter(start: string, end: string) {
  return { gte: new Date(start + 'T00:00:00Z'), lte: new Date(end + 'T23:59:59Z') };
}

export class AnalyticsRepository {
  // ============================================================
  // DASHBOARD SUMMARY — GET /api/v1/analytics/dashboard
  // ============================================================

  async getDashboardSummary(salonId: string) {
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date(today + 'T00:00:00Z');

    // Today's bookings by status
    const [bookingsToday, pendingToday, completedToday, cancelledToday, upcomingToday, revenuePayments, upcomingAppointments] = await Promise.all([
      prisma.booking.count({ where: { salonId, date: todayDate } }),
      prisma.booking.count({ where: { salonId, date: todayDate, status: 'PENDING' } }),
      prisma.booking.count({ where: { salonId, date: todayDate, status: 'COMPLETED' } }),
      prisma.booking.count({ where: { salonId, date: todayDate, status: 'CANCELLED' } }),
      prisma.booking.count({ where: { salonId, date: todayDate, status: 'UPCOMING' } }),
      // Today's revenue from PAID payments
      prisma.payment.aggregate({
        where: { salonId, status: 'PAID', date: todayDate },
        _sum: { amountPaise: true },
      }),
      // Upcoming appointments (future PENDING/UPCOMING bookings)
      prisma.booking.findMany({
        where: { salonId, date: { gte: todayDate }, status: { in: ['PENDING', 'UPCOMING'] } },
        include: { service: true, staff: true },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        take: 10,
      }),
    ]);

    return {
      bookingsToday,
      pendingToday,
      completedToday,
      cancelledToday,
      upcomingToday,
      revenueTodayPaise: revenuePayments._sum.amountPaise || 0,
      upcomingAppointments: upcomingAppointments.map((b) => ({
        bookingId: b.id,
        customerName: b.customerName,
        serviceName: b.serviceName,
        staffName: b.staffName,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        pricePaise: b.pricePaise,
        status: b.status,
      })),
    };
  }

  // ============================================================
  // FULL ANALYTICS — GET /api/v1/analytics
  // ============================================================

  async getFullAnalytics(salonId: string, range: string, custom?: { dateFrom?: string; dateTo?: string }) {
    const { start, end, label } = getRangeBounds(range, custom);

    const [revenue, bookings, services, staff, customers, peakHours, peakDays] = await Promise.all([
      this.getRevenueAnalytics(salonId, start, end),
      this.getBookingAnalytics(salonId, start, end),
      this.getServiceAnalytics(salonId, start, end),
      this.getStaffAnalytics(salonId, start, end),
      this.getCustomerAnalytics(salonId, start, end),
      this.getPeakHours(salonId, start, end),
      this.getPeakDays(salonId, start, end),
    ]);

    return {
      range: { start, end, label },
      revenue,
      bookings,
      services,
      staff,
      customers,
      peakTimes: { hours: peakHours, days: peakDays },
    };
  }

  // --- Revenue ---

  async getRevenueAnalytics(salonId: string, start: string, end: string) {
    const df = dateFilter(start, end);

    const [today, yesterday, thisWeek, thisMonth, lastMonth, allTime] = await Promise.all([
      // Today
      prisma.payment.aggregate({
        where: { salonId, status: 'PAID', date: new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z') },
        _sum: { amountPaise: true },
      }),
      // Yesterday
      (() => {
        const y = new Date(); y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().split('T')[0];
        return prisma.payment.aggregate({
          where: { salonId, status: 'PAID', date: new Date(yStr + 'T00:00:00Z') },
          _sum: { amountPaise: true },
        });
      })(),
      // This Week (Sun-Sat)
      (() => {
        const d = new Date();
        const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
        const we = new Date(ws); we.setDate(ws.getDate() + 6);
        return prisma.payment.aggregate({
          where: { salonId, status: 'PAID', date: { gte: new Date(ws.toISOString().split('T')[0] + 'T00:00:00Z'), lte: new Date(we.toISOString().split('T')[0] + 'T23:59:59Z') } },
          _sum: { amountPaise: true },
        });
      })(),
      // This Month
      (() => {
        const d = new Date();
        const ms = new Date(d.getFullYear(), d.getMonth(), 1);
        const me = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return prisma.payment.aggregate({
          where: { salonId, status: 'PAID', date: { gte: new Date(ms.toISOString().split('T')[0] + 'T00:00:00Z'), lte: new Date(me.toISOString().split('T')[0] + 'T23:59:59Z') } },
          _sum: { amountPaise: true },
        });
      })(),
      // Last Month
      (() => {
        const d = new Date();
        const ls = new Date(d.getFullYear(), d.getMonth() - 1, 1);
        const le = new Date(d.getFullYear(), d.getMonth(), 0);
        return prisma.payment.aggregate({
          where: { salonId, status: 'PAID', date: { gte: new Date(ls.toISOString().split('T')[0] + 'T00:00:00Z'), lte: new Date(le.toISOString().split('T')[0] + 'T23:59:59Z') } },
          _sum: { amountPaise: true },
        });
      })(),
      // All Time (net of refunds)
      prisma.payment.findMany({
        where: { salonId, status: { in: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'] } },
        select: { amountPaise: true, refundAmountPaise: true, status: true },
      }),
    ]);

    const allTimeNet = allTime.reduce((sum, p) => {
      if (p.status === 'PAID') return sum + p.amountPaise;
      if (p.status === 'PARTIALLY_REFUNDED') return sum + p.amountPaise - (p.refundAmountPaise || 0);
      return sum; // REFUNDED → 0
    }, 0);

    // Custom range revenue
    let customPaise: number | null = null;
    {
      const custom = await prisma.payment.aggregate({
        where: { salonId, status: 'PAID', date: df },
        _sum: { amountPaise: true },
      });
      customPaise = custom._sum.amountPaise || 0;
    }

    return {
      today: today._sum.amountPaise || 0,
      yesterday: yesterday._sum.amountPaise || 0,
      thisWeek: thisWeek._sum.amountPaise || 0,
      thisMonth: thisMonth._sum.amountPaise || 0,
      lastMonth: lastMonth._sum.amountPaise || 0,
      allTime: allTimeNet,
      ...(customPaise !== null ? { customRange: customPaise } : {}),
    };
  }

  // --- Bookings ---

  async getBookingAnalytics(salonId: string, start: string, end: string) {
    const df = dateFilter(start, end);

    const [total, pending, upcoming, completed, cancelled] = await Promise.all([
      prisma.booking.count({ where: { salonId, date: df } }),
      prisma.booking.count({ where: { salonId, date: df, status: 'PENDING' } }),
      prisma.booking.count({ where: { salonId, date: df, status: 'UPCOMING' } }),
      prisma.booking.count({ where: { salonId, date: df, status: 'COMPLETED' } }),
      prisma.booking.count({ where: { salonId, date: df, status: 'CANCELLED' } }),
    ]);

    return { total, pending, upcoming, completed, cancelled };
  }

  // --- Services ---

  async getServiceAnalytics(salonId: string, start: string, end: string) {
    const df = dateFilter(start, end);

    // Booking count by service
    const bookingsByService = await prisma.booking.groupBy({
      by: ['serviceId'],
      where: { salonId, date: df },
      _count: { serviceId: true },
    });

    // Revenue by service (from PAID payments joined to bookings)
    const revenueByServiceRaw = await prisma.payment.findMany({
      where: { salonId, status: 'PAID', date: df },
      select: { bookingId: true, amountPaise: true },
    });

    // Get the serviceId for each payment's booking
    const bookingIds = revenueByServiceRaw.map((p) => p.bookingId);
    const bookings = await prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      select: { id: true, serviceId: true },
    });
    const bookingServiceMap = new Map(bookings.map((b) => [b.id, b.serviceId]));

    const revenueByServiceMap = new Map<string, number>();
    for (const p of revenueByServiceRaw) {
      const svcId = bookingServiceMap.get(p.bookingId);
      if (svcId) revenueByServiceMap.set(svcId, (revenueByServiceMap.get(svcId) || 0) + p.amountPaise);
    }

    // Get service names
    const serviceIds = [...new Set([...bookingsByService.map((b) => b.serviceId), ...revenueByServiceMap.keys()])];
    const services = await prisma.salonService.findMany({
      where: { id: { in: serviceIds }, salonId },
      select: { id: true, name: true, category: true },
    });
    const serviceMap = new Map(services.map((s) => [s.id, s]));

    const result = serviceIds.map((id) => {
      const svc = serviceMap.get(id);
      const bookingCount = bookingsByService.find((b) => b.serviceId === id)?._count.serviceId || 0;
      const revenue = revenueByServiceMap.get(id) || 0;
      return {
        serviceId: id,
        serviceName: svc?.name || 'Unknown',
        category: svc?.category || 'OTHER',
        bookingCount,
        revenuePaise: revenue,
      };
    }).sort((a, b) => b.bookingCount - a.bookingCount);

    return {
      mostBooked: result[0] || null,
      leastBooked: result[result.length - 1] || null,
      all: result,
    };
  }

  // --- Staff ---

  async getStaffAnalytics(salonId: string, start: string, end: string) {
    const df = dateFilter(start, end);

    const [bookingsByStaffRaw, completedByStaff, revenueByStaffRaw] = await Promise.all([
      prisma.booking.groupBy({
        by: ['staffId'],
        where: { salonId, date: df },
        _count: { staffId: true },
      }),
      prisma.booking.groupBy({
        by: ['staffId'],
        where: { salonId, date: df, status: 'COMPLETED' },
        _count: { staffId: true },
      }),
      // Revenue by staff — from PAID payments → booking → staffId
      prisma.payment.findMany({
        where: { salonId, status: 'PAID', date: df },
        select: { bookingId: true, amountPaise: true },
      }),
    ]);

    // Map payment → staffId
    const bookingIds = revenueByStaffRaw.map((p) => p.bookingId);
    const bookings = await prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      select: { id: true, staffId: true },
    });
    const bookingStaffMap = new Map(bookings.map((b) => [b.id, b.staffId]));

    const revenueByStaffMap = new Map<string, number>();
    for (const p of revenueByStaffRaw) {
      const staffId = bookingStaffMap.get(p.bookingId);
      if (staffId) revenueByStaffMap.set(staffId, (revenueByStaffMap.get(staffId) || 0) + p.amountPaise);
    }

    // Get staff names
    const staffIds = [...new Set([...bookingsByStaffRaw.map((b) => b.staffId), ...completedByStaff.map((b) => b.staffId), ...revenueByStaffMap.keys()])];
    const staffList = await prisma.staff.findMany({
      where: { id: { in: staffIds }, salonId },
      select: { id: true, name: true, role: true },
    });
    const staffMap = new Map(staffList.map((s) => [s.id, s]));

    const result = staffIds.map((id) => {
      const st = staffMap.get(id);
      const bookingCount = bookingsByStaffRaw.find((b) => b.staffId === id)?._count.staffId || 0;
      const completedCount = completedByStaff.find((b) => b.staffId === id)?._count.staffId || 0;
      const revenue = revenueByStaffMap.get(id) || 0;
      return {
        staffId: id,
        staffName: st?.name || 'Unknown',
        role: st?.role || 'STAFF',
        bookingCount,
        completedCount,
        revenuePaise: revenue,
      };
    }).sort((a, b) => b.bookingCount - a.bookingCount);

    return {
      mostBooked: result[0] || null,
      all: result,
    };
  }

  // --- Customers ---

  async getCustomerAnalytics(salonId: string, start: string, end: string) {
    const df = dateFilter(start, end);

    const [total, newCustomers, repeating, avgSpend, totalSpentAgg] = await Promise.all([
      prisma.customer.count({ where: { salonId } }),
      prisma.customer.count({ where: { salonId, createdAt: df } }),
      prisma.customer.count({ where: { salonId, completedBookings: { gt: 1 } } }),
      prisma.customer.aggregate({
        where: { salonId, completedBookings: { gt: 0 } },
        _avg: { totalSpentPaise: true },
      }),
      prisma.customer.aggregate({
        where: { salonId },
        _sum: { totalSpentPaise: true },
      }),
    ]);

    return {
      total,
      newCustomers,
      returning: repeating,
      repeatRate: total > 0 ? Math.round((repeating / total) * 100) : 0,
      averageSpendPaise: avgSpend._avg.totalSpentPaise ? Math.round(avgSpend._avg.totalSpentPaise) : 0,
      totalSpentPaise: totalSpentAgg._sum.totalSpentPaise || 0,
    };
  }

  // --- Peak times ---

  async getPeakHours(salonId: string, start: string, end: string) {
    const df = dateFilter(start, end);

    // Get all booking start times in the range
    const bookings = await prisma.booking.findMany({
      where: { salonId, date: df, status: { not: 'CANCELLED' } },
      select: { startTime: true },
    });

    // Count bookings per hour
    const hourMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) hourMap.set(h, 0);
    for (const b of bookings) {
      const hour = parseInt(b.startTime.split(':')[0]);
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    }

    return Array.from(hourMap.entries())
      .map(([hour, count]) => ({ hour: `${String(hour).padStart(2, '0')}:00`, count }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }

  async getPeakDays(salonId: string, start: string, end: string) {
    const df = dateFilter(start, end);

    const bookings = await prisma.booking.findMany({
      where: { salonId, date: df, status: { not: 'CANCELLED' } },
      select: { date: true },
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayMap = new Map<string, number>();
    for (const name of dayNames) dayMap.set(name, 0);

    for (const b of bookings) {
      const dow = new Date(b.date).getDay();
      const name = dayNames[dow];
      dayMap.set(name, (dayMap.get(name) || 0) + 1);
    }

    return Array.from(dayMap.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count);
  }
}

export const analyticsRepository = new AnalyticsRepository();
