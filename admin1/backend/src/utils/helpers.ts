/**
 * Shared helpers used across modules.
 */

import { randomUUID } from "crypto";

/**
 * Generate a request ID for tracing. Used by request-logger middleware.
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Generate a human-readable booking ID, e.g. "SS-DEMO-X7K2P9".
 */
export function generateBookingId(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SS-DEMO-${rand}`;
}

/**
 * Generate a human-readable support ticket ID, e.g. "SS-DEMO-1042".
 */
export function generateTicketId(): string {
  const num = 1043 + Math.floor(Math.random() * 9000);
  return `SS-DEMO-${num}`;
}

/**
 * Sanitize a user-provided ID (booking/ticket ID). Strips whitespace,
 * uppercases if it looks like an SS- prefixed ID.
 */
export function sanitizeId(id: string): string {
  const trimmed = (id || "").trim();
  if (trimmed.toUpperCase().startsWith("SS-")) {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

/**
 * Mask a mobile number, e.g. "+91 90000 00000" → "+91 XXXXX 00000".
 */
export function maskMobile(mobile: string): string {
  if (!mobile) return mobile;
  // Keep first 3 + last 5 chars visible
  if (mobile.length <= 8) return mobile.replace(/\d/g, "X");
  const start = mobile.slice(0, 3);
  const end = mobile.slice(-5);
  const middle = "X".repeat(Math.max(0, mobile.length - 8));
  return `${start}${middle}${end}`;
}

/**
 * Mask a card number, e.g. "4242424242424242" → "•••• •••• •••• 4242".
 */
export function maskCardNumber(cardNumber: string): string {
  const digits = (cardNumber || "").replace(/\s/g, "");
  if (digits.length < 4) return "•••• •••• •••• 0000";
  const last4 = digits.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

/**
 * Validate email format (RFC 5322 simplified).
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate Indian mobile number format, e.g. +91 9XXXXXXXXX.
 */
export function isValidMobile(mobile: string): boolean {
  const digits = mobile.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

/**
 * Sleep for ms milliseconds — used by retry logic.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate text to a max length with ellipsis.
 */
export function truncate(text: string, max: number): string {
  if (!text) return text;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Return current YYYY-MM-DD date string in Asia/Kolkata timezone (Srinagar, India).
 */
export function getTodayDateStringIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Return current minute of the day (0..1439) in Asia/Kolkata timezone.
 */
export function getCurrentMinutesInIST(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  return (hour % 24) * 60 + minute;
}

/**
 * Check if a given Date matches today in Asia/Kolkata timezone.
 */
export function isTodayIST(date: Date): boolean {
  try {
    const targetDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
    return targetDateStr === getTodayDateStringIST();
  } catch {
    return date.toDateString() === new Date().toDateString();
  }
}
