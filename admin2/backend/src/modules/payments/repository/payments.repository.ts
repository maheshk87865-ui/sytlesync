// ============================================================
// Payments — Repository (data access)
//
// Payments are the single source of truth for collected revenue.
// Revenue = sum of PAID payments minus refunds (REFUNDED + PARTIALLY_REFUNDED).
//
// Idempotency:
//   - bookingId is @unique on Payment — one payment per booking, no duplicates
//   - transactionId can be used by the payment gateway to detect duplicate events
// ============================================================

import { prisma } from '../../../database/prisma.js';

// Range bounds helper (shared with the frontend calculation logic)
function getRangeBounds(range: string, today: string): { start: string; end: string } {
  const d = new Date(today + 'T00:00:00');
  if (range === 'TODAY') return { start: today, end: today };
  if (range === 'WEEK') {
    const start = new Date(d); start.setDate(d.getDate() - d.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  }
  if (range === 'MONTH') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  }
  if (range === 'LAST_MONTH') {
    const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const end = new Date(d.getFullYear(), d.getMonth(), 0);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  }
  return { start: '0000-01-01', end: '9999-12-31' };
}

export class PaymentsRepository {
  async list(salonId: string, filters: any = {}) {
    const today = new Date().toISOString().split('T')[0];
    const where: any = { salonId };
    if (filters.status && filters.status !== 'ALL') where.status = filters.status;
    if (filters.method) where.method = filters.method;
    if (filters.range) {
      const { start, end } = getRangeBounds(filters.range, today);
      where.date = { gte: new Date(start + 'T00:00:00Z'), lte: new Date(end + 'T23:59:59Z') };
    }
    if (filters.customStart && filters.customEnd) {
      where.date = { gte: new Date(filters.customStart + 'T00:00:00Z'), lte: new Date(filters.customEnd + 'T23:59:59Z') };
    }
    if (filters.search) {
      where.OR = [
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { serviceName: { contains: filters.search, mode: 'insensitive' } },
        { bookingId: { contains: filters.search } },
        { transactionId: { contains: filters.search } },
      ];
    }
    return prisma.payment.findMany({
      where,
      include: { booking: true },
      orderBy: { date: 'desc' },
    });
  }

  async findById(salonId: string, id: string) {
    return prisma.payment.findFirst({
      where: { id, salonId },
      include: { booking: { include: { customer: true, service: true, staff: true } } },
    });
  }

  /**
   * Update payment status — syncs booking.paymentStatus and customer stats.
   * Runs in a transaction for atomicity.
   */
  async updateStatus(salonId: string, id: string, status: string, transactionId?: string, provider?: string) {
    const existing = await prisma.payment.findFirst({
      where: { id, salonId },
      include: { booking: true },
    });
    if (!existing) return null;

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id },
        data: {
          status: status as any,
          transactionId: status === 'PAID'
            ? (transactionId || existing.transactionId || `TXN${Date.now().toString().slice(-6)}`)
            : existing.transactionId,
          provider: provider || existing.provider,
        },
        include: { booking: true },
      });

      // Sync booking payment status
      if (payment.booking) {
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { paymentStatus: status as any },
        });
      }

      // Update customer stats if revenue actually changes
      if (existing.booking?.customerId) {
        const customerId = existing.booking.customerId;
        if (existing.status !== 'PAID' && status === 'PAID') {
          await tx.customer.update({
            where: { id: customerId },
            data: { totalSpentPaise: { increment: existing.amountPaise } },
          });
        } else if (existing.status === 'PAID' && (status === 'REFUNDED' || status === 'PARTIALLY_REFUNDED')) {
          const deduction = status === 'REFUNDED' ? existing.amountPaise : (existing.refundAmountPaise || 0);
          await tx.customer.update({
            where: { id: customerId },
            data: { totalSpentPaise: { decrement: Math.min(deduction, existing.amountPaise) } },
          });
        }
      }

      return payment;
    });
  }

  /**
   * Refund a payment — full or partial. Never deletes the original payment.
   * Maintains transaction history (refundAmount, refundDate, refundReason, refundedAt).
   */
  async refund(salonId: string, id: string, reason: string, partialAmountPaise?: number) {
    const existing = await prisma.payment.findFirst({
      where: { id, salonId },
      include: { booking: true },
    });
    if (!existing) return null;
    if (existing.status !== 'PAID' && existing.status !== 'PARTIALLY_REFUNDED') return null;

    const now = new Date();
    const isFull = !partialAmountPaise || partialAmountPaise >= existing.amountPaise;
    const refundAmount = isFull ? existing.amountPaise : partialAmountPaise;
    const previousRefund = existing.refundAmountPaise || 0;
    const totalRefunded = previousRefund + refundAmount;
    const isNowFullyRefunded = totalRefunded >= existing.amountPaise;

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id },
        data: {
          status: isNowFullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          refundAmountPaise: totalRefunded,
          refundDate: now,
          refundedAt: now,
          refundReason: reason,
        },
        include: { booking: true },
      });

      // Sync booking payment status
      if (payment.booking) {
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { paymentStatus: isNowFullyRefunded ? 'REFUNDED' as any : 'PARTIALLY_REFUNDED' as any },
        });
      }

      // Update customer totalSpent
      if (existing.booking?.customerId) {
        await tx.customer.update({
          where: { id: existing.booking.customerId },
          data: { totalSpentPaise: { decrement: Math.min(refundAmount, existing.amountPaise) } },
        });
      }

      return payment;
    });
  }

  async updateMethod(salonId: string, id: string, method: string) {
    const existing = await prisma.payment.findFirst({ where: { id, salonId } });
    if (!existing) return null;
    return prisma.payment.update({ where: { id }, data: { method: method as any } });
  }

  // --- Revenue summary (calculated from actual PAID payment records) ---

  async getRevenueSummary(salonId: string, customStart?: string, customEnd?: string) {
    const today = new Date().toISOString().split('T')[0];

    // Fetch all payments that could contribute to revenue (PAID + refunded)
    const allPayments = await prisma.payment.findMany({
      where: { salonId, status: { in: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'] } },
      select: { amountPaise: true, refundAmountPaise: true, status: true, date: true },
    });

    // Helper: revenue for a date range = sum of (amountPaise - refundAmountPaise) for PAID/partially-refunded
    // For fully REFUNDED, the net contribution is 0 (amount - full refund)
    const sumInRange = (start: string, end: string) => {
      return allPayments
        .filter((p) => {
          const pd = new Date(p.date).toISOString().split('T')[0];
          return pd >= start && pd <= end;
        })
        .reduce((sum, p) => {
          if (p.status === 'PAID') return sum + p.amountPaise;
          if (p.status === 'PARTIALLY_REFUNDED') return sum + p.amountPaise - (p.refundAmountPaise || 0);
          if (p.status === 'REFUNDED') return sum; // fully refunded → 0 net contribution
          return sum;
        }, 0);
    };

    const todayRev = sumInRange(today, today);
    const weekBounds = getRangeBounds('WEEK', today);
    const monthBounds = getRangeBounds('MONTH', today);
    const lastMonthBounds = getRangeBounds('LAST_MONTH', today);

    const allTimeRev = allPayments.reduce((sum, p) => {
      if (p.status === 'PAID') return sum + p.amountPaise;
      if (p.status === 'PARTIALLY_REFUNDED') return sum + p.amountPaise - (p.refundAmountPaise || 0);
      return sum; // REFUNDED → 0
    }, 0);

    // Custom range
    let customRev: number | null = null;
    if (customStart && customEnd) {
      customRev = sumInRange(customStart, customEnd);
    }

    return {
      today: todayRev,
      thisWeek: sumInRange(weekBounds.start, weekBounds.end),
      thisMonth: sumInRange(monthBounds.start, monthBounds.end),
      lastMonth: sumInRange(lastMonthBounds.start, lastMonthBounds.end),
      allTime: allTimeRev,
      ...(customRev !== null ? { custom: customRev, customRange: { start: customStart, end: customEnd } } : {}),
    };
  }

  // --- Idempotency check ---
  async findByTransactionId(salonId: string, transactionId: string) {
    return prisma.payment.findFirst({ where: { salonId, transactionId } });
  }
}

export const paymentsRepository = new PaymentsRepository();
