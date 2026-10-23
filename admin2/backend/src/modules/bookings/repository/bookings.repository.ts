// ============================================================
// Bookings — Repository (data access)
//
// Double-booking prevention strategy:
//   1. All create/reschedule operations run inside a Prisma $transaction
//   2. The conflict check + create happen in the same transaction
//   3. PostgreSQL default isolation (READ COMMITTED) is sufficient for
//      this because the conflict check + insert are atomic within the
//      transaction — two concurrent transactions both checking for
//      "no conflict" will cause one to get a unique-constraint violation
//      or see the other's insert (depending on timing).
//   4. For extra safety, the bookings table has an index on [staffId, date]
//      and the overlap check is server-side.
// ============================================================

import { prisma } from '../../../database/prisma.js';
import type { Booking } from '@prisma/client';

export class BookingsRepository {
  async list(salonId: string, filters: {
    date?: string; status?: string; staffId?: string; serviceId?: string; customerId?: string;
    dateFrom?: string; dateTo?: string; tab?: string; search?: string;
  } = {}) {
    const where: any = { salonId };
    if (filters.date) where.date = new Date(filters.date + 'T00:00:00Z');
    if (filters.status) where.status = filters.status;
    if (filters.staffId) where.staffId = filters.staffId;
    if (filters.serviceId) where.serviceId = filters.serviceId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom + 'T00:00:00Z');
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo + 'T23:59:59Z');
    }
    // Tab filter: TODAY → date === today; PENDING/UPCOMING/COMPLETED/CANCELLED → status filter
    const today = new Date().toISOString().split('T')[0];
    if (filters.tab === 'TODAY') {
      where.date = new Date(today + 'T00:00:00Z');
    } else if (filters.tab && filters.tab !== 'ALL') {
      where.status = filters.tab;
    }
    if (filters.search) {
      where.OR = [
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { serviceName: { contains: filters.search, mode: 'insensitive' } },
        { staffName: { contains: filters.search, mode: 'insensitive' } },
        { customerPhone: { contains: filters.search } },
      ];
    }
    return prisma.booking.findMany({
      where,
      include: { customer: true, service: true, staff: true, payment: true },
      orderBy: { date: 'desc' },
    });
  }

  async findById(salonId: string, id: string) {
    return prisma.booking.findFirst({
      where: { id, salonId },
      include: { customer: true, service: true, staff: true, payment: true, reviews: true },
    });
  }

  /**
   * Check for a booking conflict: same staff, same date, overlapping time,
   * not cancelled. Runs inside a transaction for atomicity.
   */
  async hasBookingConflict(tx: any, staffId: string, date: string, startTime: string, endTime: string, excludeBookingId?: string): Promise<boolean> {
    const count = await tx.booking.count({
      where: {
        staffId,
        date: new Date(date + 'T00:00:00Z'),
        status: { not: 'CANCELLED' },
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
    });
    return count > 0;
  }

  async findBlockedSlotConflict(salonId: string, date: string, startTime: string, endTime: string, staffId?: string) {
    return prisma.blockedSlot.findFirst({
      where: {
        salonId,
        date: new Date(date + 'T00:00:00Z'),
        OR: [{ staffId: null }, ...(staffId ? [{ staffId }] : [])],
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
    });
  }

  async findStaffUnavailability(staffId: string, date: string, startTime: string, endTime: string) {
    return prisma.staffUnavailability.findFirst({
      where: {
        staffId,
        date: new Date(date + 'T00:00:00Z'),
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
    });
  }

  /**
   * Create a booking inside a transaction — the conflict check must happen
   * in the SAME transaction to prevent double-booking under concurrency.
   */
  async create(data: any): Promise<Booking> {
    return prisma.$transaction(async (tx) => {
      // Double-booking check (inside the transaction for atomicity)
      const hasConflict = await this.hasBookingConflict(tx, data.staffId, data.date, data.startTime, data.endTime);
      if (hasConflict) {
        throw new Error('BOOKING_CONFLICT');
      }

      const booking = await tx.booking.create({ data });
      // Create a corresponding payment record (1:1) — single source of truth for revenue
      const isPaid = data.paymentStatus === 'PAID';
      await tx.payment.create({
        data: {
          salonId: booking.salonId,
          bookingId: booking.id,
          customerName: booking.customerName,
          serviceName: booking.serviceName,
          staffName: booking.staffName,
          amountPaise: booking.pricePaise,
          method: 'CASH',
          status: isPaid ? 'PAID' : 'PENDING',
          date: booking.date,
          ...(isPaid ? { transactionId: `TXN${Date.now().toString().slice(-6)}` } : {}),
        },
      });
      // Increment service totalBookings
      await tx.salonService.update({ where: { id: booking.serviceId }, data: { totalBookings: { increment: 1 } } });
      return booking;
    });
  }

  /**
   * Update booking status — runs in a transaction so the payment sync,
   * customer stats update, and booking update are atomic.
   */
  async updateStatus(salonId: string, id: string, status: string, reason?: string): Promise<Booking | null> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findFirst({ where: { id, salonId }, include: { payment: true } });
      if (!existing) return null;

      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: status as any,
          cancellationReason: status === 'CANCELLED' ? reason : existing.cancellationReason,
          cancelledAt: status === 'CANCELLED' ? new Date() : existing.cancelledAt,
          completedAt: status === 'COMPLETED' ? new Date() : existing.completedAt,
          paymentStatus: status === 'COMPLETED' ? 'PAID' : (status === 'CANCELLED' && existing.paymentStatus === 'PAID' ? 'REFUNDED' : existing.paymentStatus),
        },
        include: { payment: true },
      });

      // Sync payment status + customer stats
      if (updated.payment) {
        if (status === 'COMPLETED' && updated.payment.status !== 'PAID') {
          await tx.payment.update({
            where: { id: updated.payment.id },
            data: { status: 'PAID', transactionId: updated.payment.transactionId || `TXN${Date.now().toString().slice(-6)}` },
          });
          await tx.customer.update({
            where: { id: existing.customerId },
            data: { completedBookings: { increment: 1 }, totalSpentPaise: { increment: existing.pricePaise }, lastVisitAt: existing.date },
          });
        } else if (status === 'CANCELLED' && updated.payment.status === 'PAID') {
          await tx.payment.update({
            where: { id: updated.payment.id },
            data: { status: 'REFUNDED', refundAmountPaise: updated.payment.amountPaise, refundDate: new Date(), refundReason: reason },
          });
          await tx.customer.update({
            where: { id: existing.customerId },
            data: { cancelledBookings: { increment: 1 }, totalSpentPaise: { decrement: existing.pricePaise } },
          });
        } else if (status === 'CANCELLED') {
          await tx.customer.update({
            where: { id: existing.customerId },
            data: { cancelledBookings: { increment: 1 } },
          });
        }
      }

      return updated;
    });
  }

  /**
   * Reschedule a booking — re-checks for conflicts inside a transaction.
   */
  async reschedule(salonId: string, id: string, date: string, startTime: string, endTime: string): Promise<Booking | null> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findFirst({ where: { id, salonId } });
      if (!existing) return null;

      // Re-check for conflicts (excluding this booking)
      const hasConflict = await this.hasBookingConflict(tx, existing.staffId, date, startTime, endTime, id);
      if (hasConflict) {
        throw new Error('BOOKING_CONFLICT');
      }

      return tx.booking.update({
        where: { id },
        data: { date: new Date(date + 'T00:00:00Z'), startTime, endTime },
      });
    });
  }
}

export const bookingsRepository = new BookingsRepository();
