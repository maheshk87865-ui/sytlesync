// ============================================================
// Payments — Service (business logic)
//
// Revenue is calculated from actual PAID payment records minus refunds.
// PENDING / FAILED / cancelled-unpaid payments are NOT included.
//
// The revenue summary function is the ONE source of truth used by:
//   - Dashboard (Today's Revenue)
//   - Payments page (all 5 cards)
//   - Analytics (revenue charts)
// ============================================================

import { paymentsRepository } from '../repository/payments.repository.js';
import { NotFoundError, AppError } from '../../../middleware/errorHandler.js';

export class PaymentsService {
  async list(salonId: string, filters: any) {
    return paymentsRepository.list(salonId, filters);
  }

  async getById(salonId: string, id: string) {
    const p = await paymentsRepository.findById(salonId, id);
    if (!p) throw new NotFoundError('Payment not found');
    return p;
  }

  async updateStatus(salonId: string, id: string, status: string, transactionId?: string, provider?: string) {
    const p = await paymentsRepository.updateStatus(salonId, id, status, transactionId, provider);
    if (!p) throw new NotFoundError('Payment not found');
    return p;
  }

  async refund(salonId: string, id: string, reason: string, partialAmountPaise?: number) {
    // Verify the payment exists and is eligible for refund
    const existing = await paymentsRepository.findById(salonId, id);
    if (!existing) throw new NotFoundError('Payment not found');
    if (existing.status !== 'PAID' && existing.status !== 'PARTIALLY_REFUNDED') {
      throw new AppError('PAYMENT_NOT_REFUNDABLE', 'Only PAID or PARTIALLY_REFUNDED payments can be refunded');
    }
    // If partial amount is specified, validate it doesn't exceed remaining
    if (partialAmountPaise) {
      const alreadyRefunded = existing.refundAmountPaise || 0;
      const remaining = existing.amountPaise - alreadyRefunded;
      if (partialAmountPaise > remaining) {
        throw new AppError('BAD_REQUEST', `Refund amount exceeds remaining: ${remaining} paise`);
      }
    }
    return paymentsRepository.refund(salonId, id, reason, partialAmountPaise);
  }

  async updateMethod(salonId: string, id: string, method: string) {
    const p = await paymentsRepository.updateMethod(salonId, id, method);
    if (!p) throw new NotFoundError('Payment not found');
    return p;
  }

  /**
   * Revenue summary — the ONE source of truth.
   * Returns today / week / month / lastMonth / allTime (and optional custom range).
   * All calculated from actual payment records — never hardcoded.
   */
  async getRevenueSummary(salonId: string, customStart?: string, customEnd?: string) {
    return paymentsRepository.getRevenueSummary(salonId, customStart, customEnd);
  }
}

export const paymentsService = new PaymentsService();
