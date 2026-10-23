/**
 * Helpers: bcrypt password hashing + JWT access/refresh token utilities.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface JwtPayload {
  staffId: string;
  salonId: string;
  email: string;
  role: string;
  fullName: string;
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.jwtSecret) as any;
  return {
    staffId: decoded.staffId,
    salonId: decoded.salonId,
    email: decoded.email,
    role: decoded.role,
    fullName: decoded.fullName,
  };
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function getRefreshTokenExpiry(): Date {
  const days = parseInt(config.jwtRefreshExpiresIn, 10) || 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
