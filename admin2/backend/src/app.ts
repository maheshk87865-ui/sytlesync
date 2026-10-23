// ============================================================
// Express application setup — PRODUCTION HARDENED
//
// Security layers:
//   1. Helmet (security headers: CSP, HSTS, X-Frame-Options, etc.)
//   2. CORS (configurable origins, credentials)
//   3. Request size limits (2MB JSON, 5MB URL-encoded)
//   4. Cookie parser (HttpOnly auth cookies)
//   5. Request ID (for log correlation)
//   6. Request logging (structured, redacted)
//   7. Global rate limiting (per-IP default)
//   8. Auth middleware on every protected route
//   9. Role-based access control per route
//   10. Cross-salon isolation (requireSalonMembership on :id routes)
//   11. Zod validation on every input
//   12. Error sanitization (no raw DB errors in production)
//   13. 404 handler (no info leak)
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { requestLoggerMiddleware } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { defaultRateLimit } from './middleware/rateLimit.js';
import { prisma } from './database/prisma.js';

// Route imports
import authRoutes from './modules/auth/routes/auth.routes.js';
import salonsRoutes from './modules/salons/routes/salons.routes.js';
import staffRoutes from './modules/staff/routes/staff.routes.js';
import bookingsRoutes from './modules/bookings/routes/bookings.routes.js';
import calendarRoutes from './modules/calendar/routes/calendar.routes.js';
import availabilityRoutes from './modules/availability/routes/availability.routes.js';
import servicesRoutes from './modules/services/routes/services.routes.js';
import customersRoutes from './modules/customers/routes/customers.routes.js';
import reviewsRoutes from './modules/reviews/routes/reviews.routes.js';
import paymentsRoutes from './modules/payments/routes/payments.routes.js';
import analyticsRoutes from './modules/analytics/routes/analytics.routes.js';
import notificationsRoutes from './modules/notifications/routes/notifications.routes.js';
import supportRoutes from './modules/support/routes/support.routes.js';
import settingsRoutes from './modules/settings/routes/settings.routes.js';
import auditRoutes from './modules/audit/routes/audit.routes.js';

export function createApp(): express.Application {
  const app = express();

  // --- 1. Security headers (Helmet) ---
  app.use(helmet({
    contentSecurityPolicy: config.app.env === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
    hsts: config.app.env === 'production' ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    } : false,
  }));

  // --- 2. CORS (configurable origins) ---
  app.use(cors({
    origin: config.app.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Idempotency-Key'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400,
  }));

  // --- 3. Request size limits ---
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(cookieParser());

  // --- 4. Request ID ---
  app.use(requestIdMiddleware);

  // --- 5. Request logging ---
  app.use(requestLoggerMiddleware);

  // --- 6. Global rate limiting (per-IP, applied before auth) ---
  app.use('/api/v1', defaultRateLimit());

  // --- 7. Health check (no auth, enhanced monitoring) ---
  app.get('/api/v1/health', async (_req, res) => {
    const checks: any = { status: 'healthy', timestamp: new Date().toISOString() };
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch {
      checks.status = 'degraded';
      checks.database = 'unreachable';
    }
    checks.uptime = process.uptime();
    checks.memory = process.memoryUsage().rss;
    const httpStatus = checks.status === 'healthy' ? 200 : 503;
    return res.status(httpStatus).json({ success: checks.status === 'healthy', data: checks });
  });

  // --- 8. API v1 routes (each module applies its own auth + rate limits) ---
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/salon', salonsRoutes);
  app.use('/api/v1/staff', staffRoutes);
  app.use('/api/v1/bookings', bookingsRoutes);
  app.use('/api/v1/calendar', calendarRoutes);
  app.use('/api/v1/availability', availabilityRoutes);
  app.use('/api/v1/services', servicesRoutes);
  app.use('/api/v1/customers', customersRoutes);
  app.use('/api/v1/reviews', reviewsRoutes);
  app.use('/api/v1/payments', paymentsRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/v1/support', supportRoutes);
  app.use('/api/v1/settings', settingsRoutes);
  app.use('/api/v1/audit', auditRoutes);

  // --- 9. 404 (unmatched routes — no info leak) ---
  app.use(notFoundHandler);

  // --- 10. Centralized error handler (must be last) ---
  app.use(errorHandler);

  return app;
}
