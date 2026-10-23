// ============================================================
// Analytics — Service
// ============================================================

import { analyticsRepository } from '../repository/analytics.repository.js';

export class AnalyticsService {
  /**
   * Dashboard summary — quick metrics for the salon dashboard page.
   * Always calculated from real DB data, never hardcoded.
   */
  async getDashboardSummary(salonId: string) {
    return analyticsRepository.getDashboardSummary(salonId);
  }

  /**
   * Full analytics — comprehensive metrics for the analytics page.
   * All values calculated from actual booking/payment/customer records.
   */
  async getFullAnalytics(salonId: string, range: string, custom?: { dateFrom?: string; dateTo?: string }) {
    return analyticsRepository.getFullAnalytics(salonId, range, custom);
  }
}

export const analyticsService = new AnalyticsService();
