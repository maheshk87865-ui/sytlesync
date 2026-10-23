// ============================================================
// Support — Routes
//
// GET    /api/v1/support              — any salon member
// POST   /api/v1/support              — any salon member (create ticket)
// GET    /api/v1/support/:id           — any salon member (cross-salon guard)
// POST   /api/v1/support/:id/respond   — any salon member
// PATCH  /api/v1/support/:id/status    — Owner + Manager
// ============================================================

import { Router } from 'express';
import { supportController } from '../controller/support.controller.js';
import { authenticate, requireOwnerOrManager, requireSalonMembership } from '../../../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', supportController.list);
router.post('/', supportController.create);

router.get('/:id', requireSalonMembership('supportTicket'), supportController.getById);
router.post('/:id/respond', requireSalonMembership('supportTicket'), supportController.respond);
router.patch('/:id/status', requireOwnerOrManager, requireSalonMembership('supportTicket'), supportController.updateStatus);

export default router;
