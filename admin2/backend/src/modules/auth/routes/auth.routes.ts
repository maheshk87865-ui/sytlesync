// ============================================================
// Auth — Routes (with rate limiting on sensitive endpoints)
// ============================================================

import { Router } from 'express';
import { authController } from '../controller/auth.controller.js';
import { validateRequest } from '../../../middleware/validate.js';
import { authenticate, requireOwnerOrManager, requireSalonMembership } from '../../../middleware/auth.js';
import { loginRateLimit, passwordResetRateLimit } from '../../../middleware/rateLimit.js';
import {
  loginSchema, registerSalonSchema, refreshTokenSchema, forgotPasswordSchema,
  resetPasswordSchema, changePasswordSchema, createUserSchema, updateUserSchema,
} from '../validation/schemas.js';

const router = Router();

// Public routes (no auth, but rate-limited)
router.post('/register', validateRequest(registerSalonSchema, 'body'), authController.register);
router.post('/login', loginRateLimit(), validateRequest(loginSchema, 'body'), authController.login);
router.post('/refresh', validateRequest(refreshTokenSchema, 'body'), authController.refresh);
router.post('/forgot-password', passwordResetRateLimit(), validateRequest(forgotPasswordSchema, 'body'), authController.forgotPassword);
router.post('/reset-password', passwordResetRateLimit(), validateRequest(resetPasswordSchema, 'body'), authController.resetPassword);

// Authenticated routes
router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, validateRequest(changePasswordSchema, 'body'), authController.changePassword);

// Owner/Manager routes
router.get('/users', authenticate, requireOwnerOrManager, authController.listUsers);
router.post('/users', authenticate, requireOwnerOrManager, validateRequest(createUserSchema, 'body'), authController.createUser);
router.put('/users/:id', authenticate, requireOwnerOrManager, requireSalonMembership('user'), validateRequest(updateUserSchema, 'body'), authController.updateUser);

export default router;
