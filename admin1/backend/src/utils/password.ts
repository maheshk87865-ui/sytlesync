/**
 * Password + token utilities.
 * ------------------------------------------------------------
 * - hashPassword / verifyPassword — bcrypt-based
 * - generateAccessToken / generateRefreshToken / verifyAccessToken
 * - generatePasswordResetToken / generateEmailVerificationToken
 *
 * All tokens are cryptographically random (crypto.randomBytes).
 * JWT access tokens carry { userId, role, email }.
 * Refresh tokens are opaque strings stored in the DB.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { config } from "../config";

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_LENGTH = 32;
const VERIFICATION_TOKEN_LENGTH = 32;
const REFRESH_TOKEN_LENGTH = 48;

// ─── Password ───────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Access Token (JWT) ─────────────────────────────────────────
export interface AccessTokenPayload {
  userId: string;
  role: string;
  email: string;
  customerId?: string; // linked Customer record ID (for bookings/reviews)
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, config.jwtSecret) as any;
  return {
    userId: decoded.userId,
    role: decoded.role,
    email: decoded.email,
    customerId: decoded.customerId,
  };
}

// ─── Refresh Token (opaque) ─────────────────────────────────────
export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_LENGTH).toString("hex");
}

export function getRefreshTokenExpiry(): Date {
  const days = parseInt(config.jwtRefreshExpiresIn?.replace(/\D/g, "") || "30", 10);
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

// ─── Password Reset Token ──────────────────────────────────────
export function generatePasswordResetToken(): string {
  return randomBytes(RESET_TOKEN_LENGTH).toString("hex");
}

export function getPasswordResetExpiry(): Date {
  // Password reset tokens expire in 1 hour
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1);
  return expiry;
}

// ─── Email Verification Token ──────────────────────────────────
export function generateEmailVerificationToken(): string {
  return randomBytes(VERIFICATION_TOKEN_LENGTH).toString("hex");
}

export function getEmailVerificationExpiry(): Date {
  // Email verification tokens expire in 24 hours
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
}
