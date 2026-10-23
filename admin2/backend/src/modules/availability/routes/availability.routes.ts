// ============================================================
// Availability — Routes
//
// GET    /api/v1/availability               — any salon member (get calculated slots)
// GET    /api/v1/availability/blocks        — any salon member (list blocks + breaks)
// POST   /api/v1/availability/blocks        — Owner + Manager (create block)
// POST   /api/v1/availability/breaks         — Owner + Manager (create break)
// DELETE /api/v1/availability/blocks/:id    — Owner + Manager (remove block/break)
//
// All routes are salon-scoped via authenticate middleware.
// ============================================================

import { Router } from 'express';
import { availabilityController } from '../controller/availability.controller.js';
import { authenticate, requireOwnerOrManager, requireSalonMembership } from '../../../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Get calculated slots (AVAILABLE, BOOKED, BLOCKED, BREAK, UNAVAILABLE)
router.get('/', availabilityController.getSlots);

// List blocked slots + breaks
router.get('/blocks', availabilityController.listBlocks);

// Create a block
router.post('/blocks', requireOwnerOrManager, availabilityController.createBlock);

// Create a break (convenience — same as blocks with type=BREAK)
router.post('/breaks', requireOwnerOrManager, availabilityController.createBreak);

// Remove a block/break
router.delete('/blocks/:id', requireOwnerOrManager, requireSalonMembership('blockedSlot'), availabilityController.removeBlock);

export default router;
