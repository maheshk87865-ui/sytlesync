/**
 * Misc helpers: ID generation, masking, validation.
 */

import crypto from "crypto";

export function generateBookingId(): string {
  // SS-BKG-XXXXXX (alphanumeric, 6 chars)
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  return `SS-BKG-${rand}`;
}

export function maskCardNumber(num: string): string {
  if (!num || num.length < 4) return num || "";
  return `•••• ${num.slice(-4)}`;
}

export function maskMobile(mobile: string): string | null {
  if (!mobile) return null;
  const trimmed = mobile.trim();
  if (trimmed.length < 4) return trimmed;
  return `${trimmed.slice(0, 2)}••••${trimmed.slice(-2)}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidMobile(mobile: string): boolean {
  return /^\+?[\d\s-]{8,15}$/.test(mobile);
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Compute end time given start time + duration minutes. */
export function computeEndTime(startTime: string, durationMinutes: number): string {
  const startMin = timeToMinutes(startTime);
  if (!Number.isFinite(startMin)) return startTime;
  return minutesToTime(startMin + durationMinutes);
}

/** Do two time ranges [aStart, aEnd) and [bStart, bEnd) overlap? */
export function timeRangesOverlap(
  aStart: string, aEnd: string,
  bStart: string, bEnd: string
): boolean {
  const aS = timeToMinutes(aStart);
  const aE = timeToMinutes(aEnd);
  const bS = timeToMinutes(bStart);
  const bE = timeToMinutes(bEnd);
  if ([aS, aE, bS, bE].some((n) => !Number.isFinite(n))) return false;
  // Overlap if aStart < bEnd AND bStart < aEnd
  return aS < bE && bS < aE;
}
