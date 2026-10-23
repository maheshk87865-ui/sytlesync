// ============================================================
// Analytics — Routes (Owner + Manager — business intelligence, no staff)
// ============================================================

import { Router } from 'express';
import { analyticsController } from '../controller/analytics.controller.js';
import { authenticate, requireOwnerOrManager } from '../../../middleware/auth.js';

const router = Router();
router.use(authenticate, requireOwnerOrManager);

router.get('/dashboard', analyticsController.dashboard);
router.get('/', analyticsController.full);

export default router;
