// ============================================================
// Settings — Repository
// ============================================================

import { prisma } from '../../../database/prisma.js';

export class SettingsRepository {
  async get(salonId: string) {
    return prisma.salonSettings.findUnique({ where: { salonId } });
  }

  async upsert(salonId: string, data: any) {
    return prisma.salonSettings.upsert({
      where: { salonId },
      create: { salonId, data },
      update: { data },
    });
  }
}

export const settingsRepository = new SettingsRepository();
