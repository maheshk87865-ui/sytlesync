// ============================================================
// Services (catalog) — Routes
//
// GET    /api/v1/services                  — any authenticated salon member
// POST   /api/v1/services                  — Owner + Manager
// GET    /api/v1/services/:id               — any authenticated salon member (cross-salon guard)
// PATCH  /api/v1/services/:id               — Owner + Manager (cross-salon guard)
// POST   /api/v1/services/:id/deactivate    — Owner + Manager (soft-delete)
// POST   /api/v1/services/:id/reactivate    — Owner + Manager (restore)
// POST   /api/v1/services/:id/toggle-active — Owner + Manager (convenience)
// DELETE /api/v1/services/:id               — Owner + Manager (safe delete)
// ============================================================

import { Router } from 'express';
import { servicesController } from '../controller/services.controller.js';
import { authenticate, requireOwnerOrManager, requireSalonMembership } from '../../../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', servicesController.list);
router.get('/:id', requireSalonMembership('service'), servicesController.getById);

router.post('/', requireOwnerOrManager, servicesController.create);
router.patch('/:id', requireOwnerOrManager, requireSalonMembership('service'), servicesController.update);
router.post('/:id/deactivate', requireOwnerOrManager, requireSalonMembership('service'), servicesController.deactivate);
router.post('/:id/reactivate', requireOwnerOrManager, requireSalonMembership('service'), servicesController.reactivate);
router.post('/:id/toggle-active', requireOwnerOrManager, requireSalonMembership('service'), servicesController.toggleActive);
router.delete('/:id', requireOwnerOrManager, requireSalonMembership('service'), servicesController.remove);

export default router;
