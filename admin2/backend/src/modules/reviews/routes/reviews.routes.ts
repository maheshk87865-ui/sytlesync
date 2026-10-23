// ============================================================
// Reviews — Routes
//
// GET    /api/v1/reviews              — any salon member (list with filters)
// POST   /api/v1/reviews              — Owner + Manager
// GET    /api/v1/reviews/analytics     — any salon member (rating distribution)
// GET    /api/v1/reviews/:id           — any salon member (cross-salon guard)
// POST   /api/v1/reviews/:id/reply     — Owner + Manager (reply, stores repliedBy + repliedAt)
// ============================================================

import { Router } from 'express';
import { reviewsController } from '../controller/reviews.controller.js';
import { authenticate, requireOwnerOrManager, requireSalonMembership } from '../../../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', reviewsController.list);
router.post('/', requireOwnerOrManager, reviewsController.create);

// Analytics must be before /:id to avoid route collision
router.get('/analytics', reviewsController.getAnalytics);

router.get('/:id', requireSalonMembership('review'), reviewsController.getById);
router.post('/:id/reply', requireOwnerOrManager, requireSalonMembership('review'), reviewsController.reply);

export default router;
