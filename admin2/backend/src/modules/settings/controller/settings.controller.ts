// ============================================================
// Settings — Controller
//
// Endpoints:
//   GET    /api/v1/settings           — get all settings
//   PATCH  /api/v1/settings           — update settings (any sections)
//   GET    /api/v1/settings/:section   — get a specific section
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { settingsService } from '../service/settings.service.js';
import { ok } from '../../../utils/response.js';
import { requireSalonContext } from '../../../middleware/auth.js';
import { ValidationError } from '../../../middleware/errorHandler.js';
import { updateSettingsSchema } from '../validation/schemas.js';

const VALID_SECTIONS = ['account', 'business', 'notifications', 'booking', 'cancellation', 'payment', 'security'];

export class SettingsController {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      return ok(res, await settingsService.get(salonId));
    } catch (err) { next(err); }
  }

  async getSection(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const section = req.params.section;
      if (!VALID_SECTIONS.includes(section)) throw new ValidationError({ section: `Invalid section. Valid: ${VALID_SECTIONS.join(', ')}` });
      return ok(res, await settingsService.getSection(salonId, section));
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { salonId } = requireSalonContext(req);
      const parsed = updateSettingsSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues);
      const updated = await settingsService.update(salonId, parsed.data);
      return ok(res, updated, 'Settings updated');
    } catch (err) { next(err); }
  }
}

export const settingsController = new SettingsController();
