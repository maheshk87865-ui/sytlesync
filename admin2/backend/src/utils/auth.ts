// ============================================================
// Auth utilities — password hashing, JWT issuing/verification,
// refresh token generation, password reset tokens.
//
// All secrets come from config — never hardcoded.
// Passwords are NEVER stored in plaintext.
// ============================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { config } from '../config/index.js';

// ---------- Password hashing ----------

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.auth.bcryptRounds);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ---------- JWT (access token) ----------

export interface JwtPayload {
  sub: string;        // userId
  salonId: string;
  role: string;       // UserRole
  type: 'access';
}

export function signAccessToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn } as jwt.SignOptions,
  );
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret) as JwtPayload;
    if (decoded.type !== 'access') return null;
    return decoded;
  } catch {
    return null;
  }
}

// ---------- Refresh token ----------

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
}

export function signRefreshToken(userId: string): string {
  // Refresh tokens live longer (30 days) and are stored hashed in the DB
  return jwt.sign({ sub: userId, type: 'refresh' }, config.auth.jwtSecret, {
    expiresIn: '30d',
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): { sub: string } | null {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret) as RefreshTokenPayload;
    if (decoded.type !== 'refresh') return null;
    return { sub: decoded.sub };
  } catch {
    return null;
  }
}

export async function hashToken(token: string): Promise<string> {
  // Hash the refresh token before storing so a DB leak doesn't expose usable tokens
  return bcrypt.hash(token, config.auth.bcryptRounds);
}

export async function verifyTokenHash(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}

// ---------- Password reset token ----------

export function generateResetToken(): { token: string; expiresAt: Date } {
  // 32 bytes of randomness, url-safe base64
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return { token, expiresAt };
}

// ---------- Auth cookie helpers ----------

// We support both Bearer token (for API clients) and HttpOnly cookies (for web).
// The cookie approach is more secure against XSS token theft.

export function setAuthCookie(res: import('express').Response, token: string): void {
  res.cookie(config.auth.cookieName, token, {
    httpOnly: true,
    secure: config.auth.cookieSecure,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });
}

export function clearAuthCookie(res: import('express').Response): void {
  res.clearCookie(config.auth.cookieName, { path: '/' });
}

export function extractToken(req: import('express').Request): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  // 2. HttpOnly cookie
  const cookie = req.cookies?.[config.auth.cookieName];
  if (cookie) return cookie;
  return null;
}
