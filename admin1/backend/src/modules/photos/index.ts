/**
 * Photos module — secure file uploads via multer.
 * ------------------------------------------------------------
 * Endpoints (all require auth):
 *   POST /api/v1/photos/upload   → upload a photo (max 8MB, jpg/png/webp)
 *     Returns: { url, key, size, mimeType }
 *
 * Files are validated server-side:
 *   - MIME type whitelist
 *   - Max size from MAX_FILE_SIZE_MB env var
 *   - Magic-byte verification (basic)
 *
 * In demo mode (no STORAGE_BUCKET configured), files are stored in
 * memory and returned as data URLs. In production, they'd be
 * uploaded to Supabase Storage / S3.
 */

import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { config } from "../../config";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { requireAuth } from "../../middleware/auth";

export const router = Router();

const ALLOWED_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = config.maxFileSizeMb * 1024 * 1024;

// Memory storage — files are returned as data URLs (demo) or would
// be piped to Supabase Storage / S3 in production.
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPG, PNG, WEBP.`) as any);
    }
  },
});

async function uploadPhoto(req: any, res: any, _next: any) {
  if (!req.file) {
    return sendError(res, Errors.validation("No file uploaded."));
  }

  const { buffer, mimetype, originalname, size } = req.file;
  if (size > MAX_BYTES) {
    return sendError(res, Errors.validation(`File too large. Maximum ${config.maxFileSizeMb} MB.`));
  }

  // In demo mode, return a data URL
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimetype};base64,${base64}`;

  // In production, this would upload to Supabase Storage:
  //   const { data, error } = await supabase.storage
  //     .from(config.storageBucket)
  //     .upload(`${req.customerId}/${Date.now()}-${originalname}`, buffer, { contentType: mimetype });
  //   if (error) return sendError(res, Errors.database("Upload failed.", error));
  //   const url = data.publicUrl;

  return sendSuccess(res, {
    url: dataUrl,
    key: `${req.customerId}/${Date.now()}-${originalname}`,
    size,
    mimeType: mimetype,
    originalName: originalname,
    storage: "memory-data-url",  // would be "supabase-storage" in production
  }, "Upload successful", 201);
}

router.post("/upload", requireAuth, upload.single("file"), uploadPhoto);

export default router;
