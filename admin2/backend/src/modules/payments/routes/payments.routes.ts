// ============================================================
// Payments — Routes (with rate limiting + idempotency)
// ============================================================

import { Router } from 'express';
import { paymentsController } from '../controller/payments.controller.js';
import { authenticate, requireOwnerOrManager, requireSalonMembership } from '../../../middleware/auth.js';
import { paymentRateLimit } from '../../../middleware/rateLimit.js';
import { idempotency } from '../../../middleware/idempotency.js';

const router = Router();
router.use(authenticate, requireOwnerOrManager);

router.get('/', paymentsController.list);
router.get('/summary', paymentsController.getSummary);

router.get('/:id', requireSalonMembership('payment'), paymentsController.getById);
router.post('/:id/status', requireSalonMembership('payment'), paymentRateLimit(), idempotency(), paymentsController.updateStatus);
router.post('/:id/refund', requireSalonMembership('payment'), paymentRateLimit(), idempotency(), paymentsController.refund);
router.patch('/:id/method', requireSalonMembership('payment'), paymentsController.updateMethod);

export default router;
