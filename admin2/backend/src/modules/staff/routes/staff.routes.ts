// ============================================================
// Staff — Routes
//
// GET    /api/v1/staff                         — any salon member (list colleagues)
// POST   /api/v1/staff                         — Owner + Manager
// GET    /api/v1/staff/:id                      — any salon member (cross-salon guard)
// PATCH  /api/v1/staff/:id                      — Owner + Manager
// DELETE /api/v1/staff/:id                      — Owner + Manager
// PATCH  /api/v1/staff/:id/services              — Owner + Manager (replace service assignments)
// GET    /api/v1/staff/:id/services              — any salon member
// PATCH  /api/v1/staff/:id/schedule              — Owner + Manager (replace weekly schedule)
// GET    /api/v1/staff/:id/schedule              — any salon member
// POST   /api/v1/staff/:id/unavailability        — Owner + Manager (add temporary time-off)
// GET    /api/v1/staff/:id/unavailability        — any salon member
// DELETE /api/v1/staff/:id/unavailability/:uid   — Owner + Manager (remove a time-off entry)
// ============================================================

import { Router } from 'express';
import { staffController } from '../controller/staff.controller.js';
import { authenticate, requireOwnerOrManager, requireSalonMembership } from '../../../middleware/auth.js';

const router = Router();
router.use(authenticate);

// List + create
router.get('/', staffController.list);
router.post('/', requireOwnerOrManager, staffController.create);

// Single staff CRUD (with cross-salon guard)
router.get('/:id', requireSalonMembership('staff'), staffController.getById);
router.patch('/:id', requireOwnerOrManager, requireSalonMembership('staff'), staffController.update);
router.delete('/:id', requireOwnerOrManager, requireSalonMembership('staff'), staffController.remove);

// Service assignments
router.get('/:id/services', requireSalonMembership('staff'), staffController.listServices);
router.patch('/:id/services', requireOwnerOrManager, requireSalonMembership('staff'), staffController.setServices);

// Schedule
router.get('/:id/schedule', requireSalonMembership('staff'), staffController.getSchedule);
router.patch('/:id/schedule', requireOwnerOrManager, requireSalonMembership('staff'), staffController.setSchedule);

// Temporary unavailability (time-off)
router.post('/:id/unavailability', requireSalonMembership('staff'), staffController.addUnavailability);
router.get('/:id/unavailability', requireSalonMembership('staff'), staffController.listUnavailabilities);
router.delete('/:id/unavailability/:uid', requireOwnerOrManager, requireSalonMembership('staff'), staffController.removeUnavailability);

export default router;
