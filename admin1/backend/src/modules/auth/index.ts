/**
 * Auth module — JWT-based customer authentication.
 * ------------------------------------------------------------
 * Endpoints:
 *   POST   /api/v1/auth/signup           → create account (email + password)
 *   POST   /api/v1/auth/login            → login with email + password
 *   POST   /api/v1/auth/logout           → logout (revokes refresh token)
 *   POST   /api/v1/auth/refresh           → refresh access token
 *   POST   /api/v1/auth/forgot-password   → request password reset email
 *   POST   /api/v1/auth/reset-password    → reset password with token
 *   POST   /api/v1/auth/verify-email      → verify email with token
 *   GET    /api/v1/auth/me                → get current user (requires auth)
 *
 * Security:
 *   - Passwords hashed with bcrypt (12 rounds)
 *   - JWT access tokens carry { userId, role, email }
 *   - Refresh tokens are opaque random strings stored in DB
 *   - Role is ALWAYS set server-side to "CUSTOMER" — never trusted from frontend
 *   - Password reset tokens expire in 1 hour
 *   - Email verification tokens expire in 24 hours
 *
 * Architecture is ready for:
 *   - Google login (POST /api/v1/auth/google — placeholder)
 *   - Apple login (POST /api/v1/auth/apple — placeholder)
 *   - Phone OTP (POST /api/v1/auth/phone-otp — placeholder)
 * These providers are NOT required if API keys are unavailable.
 */

import { Router } from "express";
import { z } from "zod";
import { getDb } from "../../database";
import { config } from "../../config";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { guardDatabase } from "../../middleware/guard-database";
import { validateBody } from "../../middleware/validate-request";
import {
  hashPassword, verifyPassword,
  generateAccessToken, verifyAccessToken,
  generateRefreshToken, getRefreshTokenExpiry,
  generatePasswordResetToken, getPasswordResetExpiry,
  generateEmailVerificationToken, getEmailVerificationExpiry,
} from "../../utils/password";
import { isValidEmail } from "../../utils/helpers";
import { sendOtp, verifyOtp, normalizeIndianPhone } from "../../services/otp-service";
import { otpLimiter } from "../../middleware/rate-limiter";

export const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────────
const signupSchema = z.object({
  email: z.string().refine(isValidEmail, "Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  fullName: z.string().min(1, "Full name is required").max(120),
  phone: z.string().min(10, "Please enter a valid phone number").max(20).optional(),
});

const loginSchema = z.object({
  email: z.string().refine(isValidEmail, "Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required").optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().refine(isValidEmail, "Please enter a valid email"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

const sendOtpSchema = z.object({
  phone: z.string().min(10, "Please enter a valid 10-digit phone number"),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(10, "Please enter a valid 10-digit phone number"),
  code: z.string().length(6, "Verification code must be 6 digits"),
  fullName: z.string().max(120).optional(),
});

// ─── Handlers ────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/signup
 * Creates a new User + AuthCredential + UserProfile + CustomerPreferences.
 * Role is ALWAYS set to "CUSTOMER" server-side — the frontend cannot
 * assign itself a different role.
 */
async function signup(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured. Set DATABASE_URL in .env"));
  }
  const { email, password, fullName, phone } = req.body;
  const db = getDb();

  // Check for duplicate email
  const existing = await db.user.findUnique({ where: { email } }).catch(() => null);
  if (existing) {
    return sendError(res, Errors.conflict("An account with this email already exists."));
  }

  // Check for duplicate phone (if provided)
  if (phone) {
    const existingPhone = await db.user.findUnique({ where: { phone } }).catch(() => null);
    if (existingPhone) {
      return sendError(res, Errors.conflict("An account with this phone number already exists."));
    }
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create User + AuthCredential + UserProfile + CustomerPreferences +
  // Customer (legacy) in a transaction
  const result = await db.$transaction(async (tx) => {
    // Role is ALWAYS set server-side — never trusted from the frontend.
    const newUser = await tx.user.create({
      data: {
        email,
        phone: phone || null,
        role: "CUSTOMER",   // hardcoded — customer frontend cannot override
        status: "active",
        emailVerified: false,
      },
    });

    await tx.authCredential.create({
      data: {
        userId: newUser.id,
        passwordHash,
      },
    });

    await tx.userProfile.create({
      data: {
        userId: newUser.id,
        fullName,
        email,
        phone: phone || null,
      },
    });

    await tx.customerPreferences.create({
      data: {
        userId: newUser.id,
      },
    });

    // Also create a Customer record (for backward compat with bookings)
    const customer = await tx.customer.create({
      data: {
        authId: newUser.id,
        userId: newUser.id,
        email,
        name: fullName,
        mobile: phone || null,
      },
    });

    // Generate email verification token
    const verifyToken = generateEmailVerificationToken();
    await tx.emailVerificationToken.create({
      data: {
        userId: newUser.id,
        token: verifyToken,
        expiresAt: getEmailVerificationExpiry(),
      },
    });

    return { user: newUser, customer, verifyToken };
  }).catch((e: any) => {
    if (e?.code === "P2002") {
      throw Errors.conflict("An account with this email already exists.");
    }
    throw Errors.database("Could not create your account. Please try again.", e);
  });

  // Issue access + refresh tokens — include customerId for bookings/reviews
  const accessToken = generateAccessToken({
    userId: result.user.id,
    role: result.user.role,
    email: result.user.email,
    customerId: result.customer.id,
  });
  const refreshToken = generateRefreshToken();
  const refreshTokenExpiry = getRefreshTokenExpiry();

  await db.refreshToken.create({
    data: {
      userId: result.user.id,
      token: refreshToken,
      expiresAt: refreshTokenExpiry,
    },
  }).catch(() => { /* best-effort */ });

  return sendSuccess(res, {
    token: accessToken,
    refreshToken,
    user: {
      id: result.user.id,
      email: result.user.email,
      phone: result.user.phone,
      role: result.user.role,
      emailVerified: result.user.emailVerified,
    },
    profile: {
      fullName,
      email,
      phone: phone || null,
    },
    // Demo: return the verification token in the API response.
    // Production: this would be sent via email only — not in the response.
    emailVerificationToken: result.verifyToken,
  }, "Account created successfully. Please verify your email.", 201);
}

/**
 * POST /api/v1/auth/login
 * Verifies email + password, issues access + refresh tokens,
 * updates lastLoginAt for session tracking.
 */
async function login(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured. Set DATABASE_URL in .env"));
  }
  const { email, password } = req.body;
  const db = getDb();

  // Look up user
  const user = await db.user.findUnique({
    where: { email },
    include: { credential: true },
  }).catch(() => null);

  // Generic error message — don't reveal whether the email exists
  if (!user || !user.credential) {
    return sendError(res, Errors.auth("Invalid email or password."));
  }

  // Check account status
  if (user.status === "suspended") {
    return sendError(res, Errors.permission("Your account has been suspended. Please contact support."));
  }
  if (user.status === "deleted") {
    return sendError(res, Errors.auth("This account no longer exists."));
  }

  // Verify password
  const valid = await verifyPassword(password, user.credential.passwordHash);
  if (!valid) {
    return sendError(res, Errors.auth("Invalid email or password."));
  }

  // Update lastLoginAt
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  }).catch(() => { /* best-effort */ });

  // Look up the Customer record (linked via userId) — include in JWT
  // so booking/review/favorite modules can use req.customerId.
  const customer = await db.customer.findUnique({
    where: { userId: user.id },
    select: { id: true },
  }).catch(() => null);

  // Issue tokens — include customerId for bookings/reviews/favorites
  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
    email: user.email,
    customerId: customer?.id,
  });
  const refreshToken = generateRefreshToken();
  const refreshTokenExpiry = getRefreshTokenExpiry();

  await db.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: refreshTokenExpiry,
    },
  }).catch(() => { /* best-effort */ });

  // Load profile for response
  const profile = await db.userProfile.findUnique({
    where: { userId: user.id },
    select: { fullName: true, phone: true, profileImage: true },
  }).catch(() => null);

  return sendSuccess(res, {
    token: accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerified,
    },
    profile,
  }, "Signed in successfully");
}

/**
 * POST /api/v1/auth/logout
 * Revokes the refresh token (server-side). Access token is stateless
 * and expires on its own — the client should also discard it.
 */
async function logout(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendSuccess(res, { loggedOut: true }, "Signed out successfully");
  }
  const db = getDb();
  const { refreshToken } = req.body || {};

  if (refreshToken) {
    await db.refreshToken.updateMany({
      where: { token: refreshToken, revoked: false },
      data: { revoked: true },
    }).catch(() => { /* best-effort */ });
  }

  return sendSuccess(res, { loggedOut: true }, "Signed out successfully");
}

/**
 * POST /api/v1/auth/refresh
 * Validates the refresh token, issues a new access token + new refresh
 * token, and revokes the old refresh token (rotation).
 */
async function refresh(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const { refreshToken } = req.body;
  const db = getDb();

  // Look up the refresh token
  const stored = await db.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  }).catch(() => null);

  if (!stored) {
    return sendError(res, Errors.auth("Invalid refresh token. Please sign in again."));
  }
  if (stored.revoked) {
    return sendError(res, Errors.auth("Session has been revoked. Please sign in again."));
  }
  if (stored.expiresAt < new Date()) {
    return sendError(res, Errors.auth("Session has expired. Please sign in again."));
  }

  // Revoke old refresh token (rotation)
  await db.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  }).catch(() => { /* best-effort */ });

  // Look up Customer record for the user — include customerId in new JWT
  const customer = await db.customer.findUnique({
    where: { userId: stored.user.id },
    select: { id: true },
  }).catch(() => null);

  // Issue new tokens — include customerId
  const newAccessToken = generateAccessToken({
    userId: stored.user.id,
    role: stored.user.role,
    email: stored.user.email,
    customerId: customer?.id,
  });
  const newRefreshToken = generateRefreshToken();
  const newExpiry = getRefreshTokenExpiry();

  await db.refreshToken.create({
    data: {
      userId: stored.user.id,
      token: newRefreshToken,
      expiresAt: newExpiry,
    },
  }).catch(() => { /* best-effort */ });

  return sendSuccess(res, {
    token: newAccessToken,
    refreshToken: newRefreshToken,
  }, "Session refreshed");
}

/**
 * POST /api/v1/auth/forgot-password
 * Generates a password reset token. In demo mode, the token is returned
 * in the API response. In production, this would send an email.
 * Always returns 200 even if the email doesn't exist — don't leak
 * which emails have accounts.
 */
async function forgotPassword(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const { email } = req.body;
  const db = getDb();

  const user = await db.user.findUnique({ where: { email } }).catch(() => null);

  if (user) {
    // Generate reset token
    const token = generatePasswordResetToken();
    const expiry = getPasswordResetExpiry();

    // Invalidate any existing tokens for this user
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }).catch(() => { /* best-effort */ });

    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: expiry,
      },
    }).catch(() => { /* best-effort */ });

    // Demo: return the token in the response.
    // Production: send via email — never expose in API response.
    return sendSuccess(res, {
      message: "If an account exists with this email, a reset link has been sent.",
      // Demo only — remove in production:
      resetToken: token,
      expiresAt: expiry,
    });
  }

  // Always return success — don't reveal whether the email exists
  return sendSuccess(res, {
    message: "If an account exists with this email, a reset link has been sent.",
  });
}

/**
 * POST /api/v1/auth/reset-password
 * Validates the reset token, updates the password, invalidates the token.
 */
async function resetPassword(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const { token, password } = req.body;
  const db = getDb();

  const reset = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: { include: { credential: true } } },
  }).catch(() => null);

  if (!reset || reset.usedAt) {
    return sendError(res, Errors.validation("Invalid or already-used reset token."));
  }
  if (reset.expiresAt < new Date()) {
    return sendError(res, Errors.validation("Reset token has expired. Please request a new one."));
  }

  // Hash new password
  const newHash = await hashPassword(password);

  // Update password + mark token as used
  await db.$transaction(async (tx) => {
    if (reset.user.credential) {
      await tx.authCredential.update({
        where: { userId: reset.userId },
        data: { passwordHash: newHash },
      });
    } else {
      await tx.authCredential.create({
        data: {
          userId: reset.userId,
          passwordHash: newHash,
        },
      });
    }
    await tx.passwordResetToken.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    });
    // Revoke all refresh tokens for this user (force re-login)
    await tx.refreshToken.updateMany({
      where: { userId: reset.userId, revoked: false },
      data: { revoked: true },
    });
  }).catch((e: any) => {
    throw Errors.database("Could not reset password. Please try again.", e);
  });

  return sendSuccess(res, { reset: true }, "Password reset successfully. Please sign in.");
}

/**
 * POST /api/v1/auth/verify-email
 * Validates the email verification token, marks email as verified.
 */
async function verifyEmail(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const { token } = req.body;
  const db = getDb();

  const verification = await db.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  }).catch(() => null);

  if (!verification) {
    return sendError(res, Errors.validation("Invalid verification token."));
  }
  if (verification.expiresAt < new Date()) {
    return sendError(res, Errors.validation("Verification token has expired. Please request a new one."));
  }

  // Mark email as verified + delete the token
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true },
    });
    await tx.emailVerificationToken.delete({
      where: { id: verification.id },
    });
  }).catch((e: any) => {
    throw Errors.database("Could not verify email. Please try again.", e);
  });

  return sendSuccess(res, { verified: true }, "Email verified successfully.");
}

/**
 * GET /api/v1/auth/me
 * Returns the authenticated user's identity + profile + preferences.
 * Identity is derived from the JWT — never trusted from the frontend.
 */
async function me(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();

  // req.userId is derived from the JWT — NOT from the request body.
  // This is how Customer A can never access Customer B's data.
  const user = await db.user.findUnique({
    where: { id: req.userId! },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
    },
  }).catch(() => null);

  if (!user) {
    return sendError(res, Errors.notFound("Account not found."));
  }

  const profile = await db.userProfile.findUnique({
    where: { userId: req.userId! },
  }).catch(() => null);

  const preferences = await db.customerPreferences.findUnique({
    where: { userId: req.userId! },
  }).catch(() => null);

  return sendSuccess(res, {
    user,
    profile,
    preferences,
  });
}

// ─── Social/Phone Auth — Architecture Ready (placeholders) ──────
//
// These are stub endpoints. When OAuth providers (Google, Apple) or
// phone OTP become available, they'll be implemented here. They are
// NOT required for the demo to function.

async function googleAuthPlaceholder(_req: any, res: any, _next: any) {
  return sendError(res, Errors.config(
    "Google sign-in is not yet configured. Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env to enable."
  ));
}

async function appleAuthPlaceholder(_req: any, res: any, _next: any) {
  return sendError(res, Errors.config(
    "Apple sign-in is not yet configured. Set APPLE_CLIENT_ID + APPLE_TEAM_ID in .env to enable."
  ));
}

async function handleSendOtp(req: any, res: any, _next: any) {
  const { phone } = req.body;
  const result = await sendOtp(phone);
  if (!result.success) {
    return sendError(res, Errors.validation(result.message));
  }
  return sendSuccess(res, {
    cooldownSeconds: result.cooldownSeconds,
    expiresInSeconds: result.expiresInSeconds,
  }, result.message);
}

async function handleVerifyOtp(req: any, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const { phone, code, fullName } = req.body;
  const verification = verifyOtp(phone, code);
  if (!verification.success) {
    return sendError(res, Errors.auth(verification.message));
  }

  const normalized = normalizeIndianPhone(phone);
  const db = getDb();

  // Find or create user account for this verified phone number
  let user: any = await db.user.findFirst({
    where: { phone: normalized },
    include: { profile: true, customer: true },
  }).catch(() => null);

  if (!user) {
    const cleanDigits = normalized.replace(/\D/g, "");
    const email = `${cleanDigits}@phone.stylesync.in`;
    const name = fullName?.trim() || "StyleSync Customer";

    user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          phone: normalized,
          role: "CUSTOMER",
          status: "active",
          emailVerified: true,
          lastLoginAt: new Date(),
        },
      });

      const profile = await tx.userProfile.create({
        data: {
          userId: newUser.id,
          fullName: name,
          email,
          phone: normalized,
          city: "Srinagar",
        },
      });

      await tx.customerPreferences.create({
        data: {
          userId: newUser.id,
        },
      });

      const customer = await tx.customer.create({
        data: {
          authId: newUser.id,
          userId: newUser.id,
          email,
          name,
          mobile: normalized,
        },
      });

      return { ...newUser, profile, customer };
    }).catch((e: any) => {
      throw Errors.database("Could not create user account for phone.", e);
    });
  } else {
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {});
  }

  if (!user) {
    return sendError(res, Errors.database("Failed to resolve user account."));
  }

  const customerId = user.customer?.id || user.id;
  const token = generateAccessToken({ userId: user.id, customerId, role: user.role, email: user.email });
  const refreshToken = generateRefreshToken();
  const expiresAt = getRefreshTokenExpiry();

  await db.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
    },
  }).catch(() => {});

  return sendSuccess(res, {
    token,
    refreshToken,
    user: {
      id: user.id,
      customerId,
      email: user.email,
      phone: user.phone,
      role: user.role,
      fullName: user.profile?.fullName || fullName || "StyleSync Customer",
    },
  }, "Phone verification successful.");
}

// ─── Routes ──────────────────────────────────────────────────────
// Middleware order: validateBody → requireAuth → guardDatabase → handler
// (validation/auth checks run BEFORE DB-guard so input errors and missing
// tokens return the right code even when DB is down)
router.post("/signup", validateBody(signupSchema), guardDatabase, signup);
router.post("/login", validateBody(loginSchema), guardDatabase, login);
router.post("/logout", validateBody(logoutSchema), logout);  // no DB needed for empty body
router.post("/refresh", validateBody(refreshSchema), guardDatabase, refresh);
router.post("/forgot-password", validateBody(forgotPasswordSchema), guardDatabase, forgotPassword);
router.post("/reset-password", validateBody(resetPasswordSchema), guardDatabase, resetPassword);
router.post("/verify-email", validateBody(verifyEmailSchema), guardDatabase, verifyEmail);
router.get("/me", requireAuth, guardDatabase, me);

// Social/phone auth endpoints
router.post("/google", googleAuthPlaceholder);
router.post("/apple", appleAuthPlaceholder);
router.post("/phone-otp/send", otpLimiter, validateBody(sendOtpSchema), handleSendOtp);
router.post("/phone-otp/verify", otpLimiter, validateBody(verifyOtpSchema), guardDatabase, handleVerifyOtp);
router.post("/phone-otp", otpLimiter, validateBody(sendOtpSchema), handleSendOtp);

export default router;
