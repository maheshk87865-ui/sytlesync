/**
 * Rate limiting — per-endpoint limiters.
 * ------------------------------------------------------------
 * Tiered rate limiting:
 *   - apiLimiter: general traffic (100 req/min)
 *   - authLimiter: login/signup/forgot (10 req/15min)
 *   - otpLimiter: OTP verification (5 req/10min)
 *   - aiLimiter: expensive AI operations (10 req/min)
 *   - uploadLimiter: photo uploads (20 req/5min)
 *   - searchLimiter: search queries (30 req/min)
 *   - bookingLimiter: booking creation (5 req/min)
 *   - paymentLimiter: payment creation (10 req/min)
 *   - reviewLimiter: review creation (10 req/10min)
 *   - passwordResetLimiter: password reset (3 req/hour)
 */

import rateLimit from "express-rate-limit";
import { config } from "../config";

export const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  // In test mode, set a very high limit so the suite never gets throttled,
  // but the limiter still applies so it sends RateLimit-* headers (verified by T65).
  max: config.nodeEnv === "test" ? 10_000 : config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "rate_limit",
      message: "Too many requests. Please slow down and try again in a moment.",
    },
  },
});

const skipInTest = () => config.nodeEnv === "test";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.isProd ? 10 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    error: { code: "rate_limit", message: "Too many authentication attempts. Please try again later." },
  },
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: config.isProd ? 5 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    error: { code: "rate_limit", message: "Too many OTP attempts. Please request a new code." },
  },
});

// Expensive AI operations — stricter limit
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    error: { code: "rate_limit", message: "Too many AI requests. Please wait a moment." },
  },
});

// Photo uploads — moderate limit
export const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    error: { code: "rate_limit", message: "Too many uploads. Please slow down." },
  },
});

// Search — moderate limit
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    error: { code: "rate_limit", message: "Too many search requests. Please slow down." },
  },
});

// Booking creation — strict (prevent abuse)
export const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.nodeEnv === "production" ? 15 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    error: { code: "rate_limit", message: "Too many booking attempts. Please slow down." },
  },
});

// Payment creation — strict
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    error: { code: "rate_limit", message: "Too many payment attempts. Please slow down." },
  },
});

// Review creation — moderate
export const reviewLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    error: { code: "rate_limit", message: "Too many review submissions. Please slow down." },
  },
});

// Password reset — very strict (prevent email bombing)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    error: { code: "rate_limit", message: "Too many password reset requests. Please try again later." },
  },
});
