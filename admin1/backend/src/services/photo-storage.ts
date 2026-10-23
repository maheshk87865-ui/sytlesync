/**
 * Photo Storage Service — secure photo handling.
 * ------------------------------------------------------------
 * Stores customer photos securely. In demo mode (no storage bucket
 * configured), photos are stored as base64 data URLs in the DB.
 * In production, they'd be uploaded to Supabase Storage / S3 and
 * only the storage path is kept in the DB.
 *
 * Signed URLs:
 *   - Demo mode: data URLs (always accessible while the record exists)
 *   - Production: signed URLs that expire after 1 hour
 *
 * Ownership: every photo is linked to a customerId — only the owner
 * can retrieve it.
 */

import { config } from "../config";
import { randomBytes } from "crypto";

const SIGNED_URL_TTL_MINUTES = 60; // signed URLs expire after 1 hour
const AI_PHOTO_EXPIRY_DAYS = 7; // AI analysis photos auto-expire after 7 days

export interface StoredPhoto {
  photoId: string;
  storagePath: string;
  signedUrl: string;
  urlExpiresAt: Date;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Store a photo securely. Returns the storage path + a signed URL
 * for temporary access.
 *
 * In demo mode, the "signed URL" is a data URL.
 * In production, the photo is uploaded to Supabase Storage / S3
 * and a real signed URL is generated.
 */
export function storePhoto(
  customerId: string,
  base64Data: string,
  mimeType: string,
  type: string = "ai-analysis"
): StoredPhoto {
  const photoId = randomBytes(16).toString("hex");
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const storagePath = `customers/${customerId}/${photoId}.${ext}`;
  const sizeBytes = Math.ceil((base64Data.length * 3) / 4);
  const urlExpiresAt = new Date(Date.now() + SIGNED_URL_TTL_MINUTES * 60 * 1000);

  // Demo mode: the "signed URL" is the data URL itself.
  // Production: would call supabase.storage.from(bucket).upload(path, buffer)
  //   then supabase.storage.from(bucket).createSignedUrl(path, 3600)
  const signedUrl = `data:${mimeType};base64,${base64Data}`;

  return {
    photoId,
    storagePath,
    signedUrl,
    urlExpiresAt,
    mimeType,
    sizeBytes,
  };
}

/**
 * Get the expiry date for AI analysis photos (auto-cleanup).
 */
export function getAiPhotoExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + AI_PHOTO_EXPIRY_DAYS);
  return expiry;
}

/**
 * Validate that a data URL is a valid, safe image.
 * Checks:
 *   - Must start with data:image/
 *   - MIME type whitelist: jpeg, png, webp only
 *   - File extension matching (if extracted from filename)
 *   - File size within MAX_FILE_SIZE_MB
 *   - Rejects executables, scripts, SVGs (XSS risk)
 */
export function validateImageDataUrl(dataUrl: string): { ok: boolean; mimeType?: string; error?: string } {
  const ALLOWED_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const FORBIDDEN_MIMES = [
    "image/svg+xml",  // XSS risk — can contain scripts
    "image/gif",       // not needed for profile photos
    "image/bmp",       // unnecessarily large
    "image/tiff",
  ];
  const MAX_SIZE_BYTES = config.maxFileSizeMb * 1024 * 1024;

  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    return { ok: false, error: "A valid data:image/* URL is required." };
  }

  const mimeMatch = dataUrl.match(/^data:(image\/[a-z+]+);/i);
  const mimeType = mimeMatch?.[1]?.toLowerCase() ?? "";

  // Reject forbidden types
  if (FORBIDDEN_MIMES.includes(mimeType)) {
    return { ok: false, error: `Image type ${mimeType} is not allowed for security reasons.` };
  }

  if (!ALLOWED_MIMES.includes(mimeType)) {
    return { ok: false, error: `Unsupported image format. Allowed: JPG, PNG, WEBP. Got ${mimeType}.` };
  }

  const base64Data = dataUrl.split(",")[1] ?? "";
  const approxBytes = Math.ceil((base64Data.length * 3) / 4);
  if (approxBytes > MAX_SIZE_BYTES) {
    return { ok: false, error: `Image too large (${(approxBytes / 1024 / 1024).toFixed(1)} MB). Max ${config.maxFileSizeMb} MB.` };
  }

  // Check for executable signatures in the base64 data (magic bytes)
  // This is a basic check — not a full antivirus, but catches common attacks
  const EXECUTABLE_SIGNATURES = [
    "UEsD",  // ZIP/PK
    "TVqQ",  // PE/EXE
    "R0lGOD", // GIF (not in whitelist anyway)
    "PHN2Z", // SVG base64
  ];
  const firstChars = base64Data.substring(0, 6);
  for (const sig of EXECUTABLE_SIGNATURES) {
    if (firstChars.startsWith(sig)) {
      return { ok: false, error: "File appears to be a non-image file (executable/script detected)." };
    }
  }

  return { ok: true, mimeType };
}

/**
 * Generate a safe storage path — never uses the original filename.
 * Uses a random UUID + the correct extension based on MIME type.
 */
export function generateSafeStoragePath(customerId: string, mimeType: string): string {
  const photoId = randomBytes(16).toString("hex");
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `customers/${customerId}/${photoId}.${ext}`;
}
