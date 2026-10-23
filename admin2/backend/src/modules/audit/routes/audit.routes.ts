// ============================================================
// Audit — Routes (Owner only — audit logs contain all users' actions)
//
// GET /api/v1/audit — list with optional filters (action, entityType, entityId, userId, dateFrom, dateTo)
// ============================================================

import { Router } from 'express';
import { auditController } from '../controller/audit.controller.js';
import { authenticate, requireOwner } from '../../../middleware/auth.js';

const router = Router();
router.use(authenticate, requireOwner);
router.get('/', auditController.list);

export default router;
