// ============================================================
// Settings — Service
// ============================================================

import { settingsRepository } from '../repository/settings.repository.js';
import { DEFAULT_SETTINGS } from '../validation/schemas.js';

export class SettingsService {
  async get(salonId: string) {
    const settings = await settingsRepository.get(salonId);
    if (!settings) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(settings.data as any) };
  }

  async update(salonId: string, data: any) {
    const existing = await settingsRepository.get(salonId);
    const current = (existing?.data as Record<string, any>) || DEFAULT_SETTINGS;
    // Deep-merge: merge each section independently
    const merged: any = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      merged[key] = { ...DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS], ...(current[key] || {}), ...(data[key] || {}) };
    }
    await settingsRepository.upsert(salonId, merged);
    return merged;
  }

  // Get a specific section
  async getSection(salonId: string, section: string) {
    const all = await this.get(salonId);
    return (all as any)[section] || {};
  }
}

export const settingsService = new SettingsService();
