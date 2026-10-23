// Calendar — Routes (any authenticated salon member)
import { Router } from 'express';
import { calendarController } from '../controller/calendar.controller.js';
import { authenticate } from '../../../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.get('/', calendarController.get);

export default router;
