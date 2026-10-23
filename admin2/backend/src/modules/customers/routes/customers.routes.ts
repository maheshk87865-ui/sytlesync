// ============================================================
// Customers — Routes
//
// GET    /api/v1/customers              — any salon member (list with filters)
// POST   /api/v1/customers              — Owner + Manager
// GET    /api/v1/customers/insights     — Owner + Manager (calculated insights)
// GET    /api/v1/customers/:id           — any salon member (detail, cross-salon guard)
// GET    /api/v1/customers/:id/history   — any salon member (booking history)
// PATCH  /api/v1/customers/:id           — Owner + Manager
// DELETE /api/v1/customers/:id           — Owner + Manager
// ============================================================

import { Router } from 'express';
import { customersController } from '../controller/customers.controller.js';
import { authenticate, requireOwnerOrManager, requireSalonMembership } from '../../../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', customersController.list);
router.post('/', requireOwnerOrManager, customersController.create);

// Insights must be before /:id to avoid route collision
router.get('/insights', requireOwnerOrManager, customersController.getInsights);

router.get('/:id', requireSalonMembership('customer'), customersController.getById);
router.get('/:id/history', requireSalonMembership('customer'), customersController.getHistory);
router.patch('/:id', requireOwnerOrManager, requireSalonMembership('customer'), customersController.update);
router.delete('/:id', requireOwnerOrManager, requireSalonMembership('customer'), customersController.remove);

export default router;
