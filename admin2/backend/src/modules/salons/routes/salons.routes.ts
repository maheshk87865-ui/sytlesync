// ============================================================
// Salons — Routes
//
// GET    /api/v1/salon              — any authenticated salon member
// PATCH  /api/v1/salon              — Owner only (edit profile)
// PATCH  /api/v1/salon/status       — Owner + Manager (open/close the salon)
// GET    /api/v1/salon/business-hours — any authenticated salon member
// PATCH  /api/v1/salon/business-hours — Owner only (business hours affect booking)
// POST   /api/v1/salon/closure      — Owner only (temporary closure)
// DELETE /api/v1/salon/closure      — Owner only
// ============================================================

import { Router } from 'express';
import { salonsController } from '../controller/salons.controller.js';
import { authenticate, requireOwner, requireOwnerOrManager } from '../../../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', salonsController.get);
router.patch('/', requireOwner, salonsController.update);
router.patch('/status', requireOwnerOrManager, salonsController.setStatus);

router.get('/business-hours', salonsController.getBusinessHours);
router.patch('/business-hours', requireOwner, salonsController.setBusinessHours);

router.post('/closure', requireOwner, salonsController.setClosure);
router.delete('/closure', requireOwner, salonsController.clearClosure);

export default router;
