// ============================================================
// Bookings — Routes (with rate limiting on create)
// ============================================================

import { Router } from 'express';
import { bookingsController } from '../controller/bookings.controller.js';
import { authenticate, requireSalonMembership } from '../../../middleware/auth.js';
import { bookingRateLimit } from '../../../middleware/rateLimit.js';

const router = Router();
router.use(authenticate);

router.get('/', bookingsController.list);
router.post('/', bookingRateLimit(), bookingsController.create);

router.get('/:id', requireSalonMembership('booking'), bookingsController.getById);
router.post('/:id/status', requireSalonMembership('booking'), bookingsController.updateStatus);
router.post('/:id/complete', requireSalonMembership('booking'), bookingsController.complete);
router.post('/:id/cancel', requireSalonMembership('booking'), bookingsController.cancel);
router.post('/:id/reschedule', requireSalonMembership('booking'), bookingsController.reschedule);

export default router;
