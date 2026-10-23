/**
 * Customers module — customer profile + preferences management.
 * ------------------------------------------------------------
 * Endpoints (all require auth):
 *   GET    /api/v1/customers/me                → full profile + preferences
 *   PATCH  /api/v1/customers/me                → update profile (name/phone/city/etc.)
 *   GET    /api/v1/customers/me/preferences    → get preferences
 *   PATCH  /api/v1/customers/me/preferences    → update preferences
 *   GET    /api/v1/customers/me/location       → city + lat/lng
 *   PATCH  /api/v1/customers/me/location       → update location
 *
 * Security:
 *   - ALL queries filter by req.userId (from JWT) — never from request body.
 *   - Customer A CANNOT access/modify Customer B's profile.
 *   - The userId is derived from the authenticated session — the
 *     frontend cannot pass a different userId to access someone else's data.
 */

import { Router } from "express";
import { z } from "zod";
import { getDb } from "../../database";
import { config } from "../../config";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate-request";

export const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────────
const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  phone: z.string().min(10).max(20).optional(),
  profileImage: z.string().url().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  city: z.string().max(120).optional(),
  area: z.string().max(120).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const updatePreferencesSchema = z.object({
  preferredServices: z.array(z.string().min(1).max(80)).max(20).optional(),
  preferredCategories: z.array(z.string().min(1).max(80)).max(20).optional(),
  budgetRange: z.enum(["$", "$$", "$$$"]).optional(),
  maintenancePreference: z.enum(["Low", "Medium", "High"]).optional(),
  occasionPreferences: z.array(z.enum(["daily", "office", "wedding", "party", "date", "event", "casual"])).max(10).optional(),
  preferredSalonTypes: z.array(z.string().min(1).max(40)).max(10).optional(),
  preferredStaff: z.array(z.string().uuid()).max(20).optional(),
  locationPreference: z.string().max(120).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one preference field must be provided.",
});

const updateLocationSchema = z.object({
  city: z.string().max(120).optional(),
  area: z.string().max(120).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one location field must be provided.",
});

// ─── Handlers ────────────────────────────────────────────────────

/** GET /api/v1/customers/me — full profile + preferences */
async function getMe(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();

  // req.userId comes from the JWT — never from the request body.
  // This is how we enforce customer isolation.
  const profile = await db.userProfile.findUnique({
    where: { userId: req.userId! },
  }).catch(() => null);

  const preferences = await db.customerPreferences.findUnique({
    where: { userId: req.userId! },
  }).catch(() => null);

  const user = await db.user.findUnique({
    where: { id: req.userId! },
    select: {
      id: true, email: true, phone: true, role: true, status: true,
      emailVerified: true, lastLoginAt: true, createdAt: true,
    },
  }).catch(() => null);

  if (!user) {
    return sendError(res, Errors.notFound("Account not found."));
  }

  return sendSuccess(res, {
    user,
    profile,
    preferences,
  });
}

/** PATCH /api/v1/customers/me — update profile fields */
async function updateMe(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const data = { ...req.body };

  // Convert dateOfBirth string to Date if present
  if (data.dateOfBirth) {
    data.dateOfBirth = new Date(data.dateOfBirth);
  }

  // Update the UserProfile — filtered by userId from the JWT.
  // Customer A cannot update Customer B's profile because the
  // `where` clause uses req.userId (from JWT), not req.body.userId.
  const updated = await db.userProfile.upsert({
    where: { userId: req.userId! },
    create: {
      userId: req.userId!,
      fullName: data.fullName || "Customer",
      email: req.email || "",
      ...data,
    },
    update: {
      ...data,
      updatedAt: new Date(),
    },
  }).catch((e: any) => {
    throw Errors.database("Could not update your profile.", e);
  });

  return sendSuccess(res, updated, "Profile updated");
}

/** GET /api/v1/customers/me/preferences — get AI recommendation preferences */
async function getPreferences(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();

  const prefs = await db.customerPreferences.findUnique({
    where: { userId: req.userId! },
  }).catch(() => null);

  if (!prefs) {
    // Auto-create if missing
    const created = await db.customerPreferences.create({
      data: { userId: req.userId! },
    }).catch((e: any) => {
      throw Errors.database("Could not load preferences.", e);
    });
    return sendSuccess(res, created);
  }

  return sendSuccess(res, prefs);
}

/** PATCH /api/v1/customers/me/preferences — update AI recommendation preferences */
async function updatePreferences(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const data = { ...req.body };

  // Upsert — create if not exists, update if it does.
  // Filtered by userId from JWT — never from the request body.
  const updated = await db.customerPreferences.upsert({
    where: { userId: req.userId! },
    create: {
      userId: req.userId!,
      ...data,
    },
    update: {
      ...data,
      updatedAt: new Date(),
    },
  }).catch((e: any) => {
    throw Errors.database("Could not update preferences.", e);
  });

  return sendSuccess(res, updated, "Preferences updated");
}

/** GET /api/v1/customers/me/location — city + lat/lng */
async function getLocation(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();

  const profile = await db.userProfile.findUnique({
    where: { userId: req.userId! },
    select: { city: true, area: true, latitude: true, longitude: true },
  }).catch(() => null);

  if (!profile) {
    return sendSuccess(res, {
      city: null, area: null, latitude: null, longitude: null,
    });
  }

  return sendSuccess(res, profile);
}

/** PATCH /api/v1/customers/me/location — update city/area/lat/lng */
async function updateLocation(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const data = { ...req.body };

  const updated = await db.userProfile.update({
    where: { userId: req.userId! },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    select: { city: true, area: true, latitude: true, longitude: true },
  }).catch((e: any) => {
    throw Errors.database("Could not update your location.", e);
  });

  return sendSuccess(res, updated, "Location updated");
}

// ─── Routes ──────────────────────────────────────────────────────
router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, validateBody(updateProfileSchema), updateMe);
router.get("/me/preferences", requireAuth, getPreferences);
router.patch("/me/preferences", requireAuth, validateBody(updatePreferencesSchema), updatePreferences);
router.get("/me/location", requireAuth, getLocation);
router.patch("/me/location", requireAuth, validateBody(updateLocationSchema), updateLocation);

export default router;
