// ============================================================
// Notifications — Routes
//
// GET   /api/v1/notifications           — any authenticated salon user (sees only their notifications)
// PATCH /api/v1/notifications/:id/read   — any authenticated salon user (user-scoped)
// POST  /api/v1/notifications/read-all   — any authenticated salon user (marks their notifications)
//
// Security:
//   - The authenticate middleware ensures the user is logged in
//   - The repository filters by salonId + userId (null = broadcast OR their id)
//   - A Salon A user can NEVER see Salon B notifications
// ============================================================

import { Router } from 'express';
import { notificationsController } from '../controller/notifications.controller.js';
import { authenticate } from '../../../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', notificationsController.list);
router.patch('/:id/read', notificationsController.markRead);
router.post('/read-all', notificationsController.markAllRead);

export default router;
