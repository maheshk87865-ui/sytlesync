// ============================================================
// Settings — Routes (Owner only — sensitive business configuration)
//
// GET    /api/v1/settings              — get all settings
// GET    /api/v1/settings/:section     — get a specific section
// PATCH  /api/v1/settings              — update settings
// ============================================================

import { Router } from 'express';
import { settingsController } from '../controller/settings.controller.js';
import { authenticate, requireOwner } from '../../../middleware/auth.js';

const router = Router();
router.use(authenticate, requireOwner);

router.get('/', settingsController.get);
router.get('/:section', settingsController.getSection);
router.patch('/', settingsController.update);

export default router;
