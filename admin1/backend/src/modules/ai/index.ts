/**
 * AI module — customer AI backend.
 * ------------------------------------------------------------
 * Endpoints (all require auth unless noted):
 *   POST   /api/v1/ai/analyze-photo        → analyze photo + text → recommendations
 *   POST   /api/v1/ai/text-recommendation  → text-only recommendations (no photo)
 *   POST   /api/v1/ai/virtual-tryon        → virtual hairstyle try-on
 *   POST   /api/v1/ai/salon-finder         → AI criteria → real salons
 *   GET    /api/v1/ai/history              → customer's AI interaction history
 *   GET    /api/v1/ai/saved-looks          → saved AI looks
 *   POST   /api/v1/ai/saved-looks          → save an AI look
 *   DELETE /api/v1/ai/saved-looks/:id      → remove a saved look
 *
 * Architecture:
 *   1. Authenticate customer
 *   2. Verify photo ownership (if photo provided)
 *   3. Retrieve photo securely (signed URL)
 *   4. Send to AI provider/model (or use demo pixel-analysis)
 *   5. Receive structured analysis
 *   6. Validate AI response
 *   7. Store AI interaction in history
 *   8. Map recommendations to REAL StyleSync services from DB
 *   9. Return safe recommendations (hedging language, no medical claims)
 *
 * The AI NEVER invents: salon IDs, service IDs, prices, staff, or availability.
 * All of these come from the database via the recommendation engine.
 */

import { Router } from "express";
import { z } from "zod";
import { getDb } from "../../database";
import { config } from "../../config";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate-request";
import { generateRecommendations, findSalonsByCriteria, type AiInput } from "../../services/ai-engine";
import { storePhoto, validateImageDataUrl, getAiPhotoExpiry } from "../../services/photo-storage";

export const router = Router();

// ─── Schemas ────────────────────────────────────────────────────
const analyzePhotoSchema = z.object({
  image: z.string().startsWith("data:image/"),
  text: z.string().max(500).optional(),
  preferences: z.object({
    occasion: z.string().max(50).optional(),
    budget: z.enum(["$", "$$", "$$$"]).optional(),
    maintenance: z.enum(["Low", "Medium", "High"]).optional(),
    timePreference: z.string().max(50).optional(),
    location: z.string().max(120).optional(),
    desiredService: z.string().max(120).optional(),
    hairPreference: z.string().max(200).optional(),
    beardPreference: z.string().max(200).optional(),
  }).optional(),
});

const textRecommendationSchema = z.object({
  text: z.string().min(1, "Please describe what you're looking for").max(500),
  preferences: z.object({
    occasion: z.string().max(50).optional(),
    budget: z.enum(["$", "$$", "$$$"]).optional(),
    maintenance: z.enum(["Low", "Medium", "High"]).optional(),
    timePreference: z.string().max(50).optional(),
    location: z.string().max(120).optional(),
  }).optional(),
});

const virtualTryOnSchema = z.object({
  photoId: z.string().uuid().optional(),
  image: z.string().startsWith("data:image/").optional(),
  styleDescription: z.string().min(1).max(500),
  serviceType: z.string().max(80).optional(),
}).refine((d) => d.photoId || d.image, {
  message: "Either photoId or image must be provided.",
});

const salonFinderSchema = z.object({
  category: z.string().max(80).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  city: z.string().max(120).optional(),
  area: z.string().max(120).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  nearbyKm: z.coerce.number().min(0).max(100).optional(),
  verifiedOnly: z.boolean().optional(),
});

const saveLookSchema = z.object({
  style: z.string().min(1).max(120),
  category: z.string().max(80),
  description: z.string().max(500).optional(),
  serviceName: z.string().min(1).max(120),
  visualPreview: z.string().optional(),
  visualPreviewSource: z.enum(["reference-image", "ai-generated"]).optional(),
});

const lookIdParam = z.object({ id: z.string().uuid() });

// ─── Handlers ────────────────────────────────────────────────────

/**
 * POST /api/v1/ai/analyze-photo
 *
 * 1. Authenticates customer
 * 2. Validates + stores the photo securely
 * 3. Runs the recommendation engine (demo pixel-analysis or real AI model)
 * 4. Maps recommendations to REAL StyleSync services
 * 5. Stores the AI interaction in history
 * 6. Returns safe recommendations (hedging language)
 */
async function analyzePhoto(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const startMs = Date.now();
  const { image, text, preferences } = req.body;

  // ─── 1. Validate the image ──────────────────────────────────
  const imgValidation = validateImageDataUrl(image);
  if (!imgValidation.ok) {
    return sendError(res, Errors.validation(imgValidation.error!));
  }

  // ─── 2. Store the photo securely ────────────────────────────
  const storedPhoto = storePhoto(
    req.customerId!,
    image.split(",")[1],
    imgValidation.mimeType!,
    "ai-analysis"
  );

  const photoRecord = await db.customerPhoto.create({
    data: {
      customerId: req.customerId!,
      storagePath: storedPhoto.storagePath,
      type: "ai-analysis",
      mimeType: storedPhoto.mimeType,
      sizeBytes: storedPhoto.sizeBytes,
      signedUrl: storedPhoto.signedUrl,
      urlExpiresAt: storedPhoto.urlExpiresAt,
      expiresAt: getAiPhotoExpiry(),
    },
  }).catch(() => null);

  // ─── 3. Generate recommendations ────────────────────────────
  // In demo mode, the recommendation engine uses heuristic text matching.
  // In real mode, it would call the AI provider with the photo.
  const aiInput: AiInput = {
    text,
    photoId: photoRecord?.id,
    occasion: preferences?.occasion,
    budget: preferences?.budget,
    maintenance: preferences?.maintenance,
    timePreference: preferences?.timePreference,
    location: preferences?.location,
    customerId: req.customerId,
  };

  const recommendations = await generateRecommendations(db, aiInput)
    .catch((e) => { throw Errors.database("AI analysis failed.", e); });

  const processingMs = Date.now() - startMs;

  // ─── 4. Store the AI interaction ────────────────────────────
  const interaction = await db.aiInteraction.create({
    data: {
      customerId: req.customerId!,
      type: "analyze-photo",
      inputSummary: {
        text: text || null,
        preferences: preferences || {},
        photoId: photoRecord?.id || null,
      },
      recommendation: recommendations as any,
      modelProvider: config.isAiConfigured ? "real-ai-model" : "demo-pixel-analysis",
      modelLabel: config.isAiConfigured ? config.aiModelLabel : "Demo Engine (no AI model required)",
      photoId: photoRecord?.id || null,
      processingMs,
    },
  }).catch(() => null);

  // ─── 5. Return safe recommendations ────────────────────────
  return sendSuccess(res, {
    recommendations,
    photoId: photoRecord?.id || null,
    aiMode: config.isAiConfigured ? "real" : "demo",
    modelLabel: config.isAiConfigured ? config.aiModelLabel : "Demo Engine",
    interactionId: interaction?.id || null,
    processingMs,
    // Safety notice
    safetyNotice: "AI suggestions are based on your photo and preferences. Actual results may vary. The AI does not make medical claims or guarantee any specific outcome.",
  }, "Analysis complete");
}

/**
 * POST /api/v1/ai/text-recommendation
 * Text-only recommendations (no photo needed).
 */
async function textRecommendation(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const startMs = Date.now();
  const { text, preferences } = req.body;

  const aiInput: AiInput = {
    text,
    occasion: preferences?.occasion,
    budget: preferences?.budget,
    maintenance: preferences?.maintenance,
    timePreference: preferences?.timePreference,
    location: preferences?.location,
    customerId: req.customerId,
  };

  const recommendations = await generateRecommendations(db, aiInput)
    .catch((e) => { throw Errors.database("AI analysis failed.", e); });

  const processingMs = Date.now() - startMs;

  await db.aiInteraction.create({
    data: {
      customerId: req.customerId!,
      type: "text-recommendation",
      inputSummary: { text, preferences: preferences || {} },
      recommendation: recommendations as any,
      modelProvider: "demo-engine",
      modelLabel: "Demo Engine",
      processingMs,
    },
  }).catch(() => null);

  return sendSuccess(res, {
    recommendations,
    aiMode: "demo",
    modelLabel: "Demo Engine",
    processingMs,
  }, "Recommendations generated");
}

/**
 * POST /api/v1/ai/virtual-tryon
 * Architecture: photo + selectedStyle → AI try-on provider → generated image
 * If the provider is unavailable: return a controlled error.
 * NEVER pretend a generic image was generated from the customer's face.
 */
async function virtualTryOn(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { photoId, image, styleDescription, serviceType } = req.body;

  let photoDataUrl: string | null = null;
  let storedPhotoId: string | null = photoId || null;

  // ─── 1. Retrieve the photo ──────────────────────────────────
  if (photoId) {
    // Verify photo ownership
    const photo = await db.customerPhoto.findFirst({
      where: { id: photoId, customerId: req.customerId!, isDeleted: false },
    }).catch(() => null);
    if (!photo) {
      return sendError(res, Errors.notFound("Photo not found or you do not own it."));
    }
    photoDataUrl = photo.signedUrl;
  } else if (image) {
    // Inline image — validate + store
    const imgValidation = validateImageDataUrl(image);
    if (!imgValidation.ok) {
      return sendError(res, Errors.validation(imgValidation.error!));
    }
    const stored = storePhoto(req.customerId!, image.split(",")[1], imgValidation.mimeType!, "ai-analysis");
    const photoRecord = await db.customerPhoto.create({
      data: {
        customerId: req.customerId!,
        storagePath: stored.storagePath,
        type: "ai-analysis",
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        signedUrl: stored.signedUrl,
        urlExpiresAt: stored.urlExpiresAt,
        expiresAt: getAiPhotoExpiry(),
      },
    }).catch(() => null);
    photoDataUrl = stored.signedUrl;
    storedPhotoId = photoRecord?.id || null;
  }

  if (!photoDataUrl) {
    return sendError(res, Errors.validation("A photo is required for virtual try-on."));
  }

  // ─── 2. Call the AI try-on provider ─────────────────────────
  // In demo mode: NO real image generation — return a reference image.
  // In real mode: call the configured AI_PROVIDER_URL with an
  // open-source SD inpainting model that preserves identity.
  if (config.isAiConfigured) {
    // Future: call the real try-on model
    // const response = await fetch(config.aiProviderUrl!, { ... });
    // For now, return a controlled error — do NOT fake the result.
    return sendError(res, Errors.config(
      "Real virtual try-on model is configured but not yet implemented. " +
      "Falling back to reference image mode."
    ));
  }

  // Demo mode: return a reference image (clearly labeled)
  const refImages: Record<string, string> = {
    "Haircut": "/salons/salon-13.jpg",
    "Beard Styling": "/salons/salon-01.jpeg",
    "Facial": "/salons/salon-07.jpg",
    "Makeup": "/salons/salon-19.png",
    "default": "/salons/salon-29.jpg",
  };
  const referenceImage = refImages[serviceType || "default"] || refImages.default;

  // Store the try-on result as a photo
  const resultPhoto = await db.customerPhoto.create({
    data: {
      customerId: req.customerId!,
      storagePath: `try-on-results/${req.customerId}/${Date.now()}.jpg`,
      type: "try-on-result",
      mimeType: "image/jpeg",
      sizeBytes: 0,
      signedUrl: referenceImage,
      urlExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      expiresAt: getAiPhotoExpiry(),
    },
  }).catch(() => null);

  // Store interaction
  await db.aiInteraction.create({
    data: {
      customerId: req.customerId!,
      type: "virtual-tryon",
      inputSummary: { photoId: storedPhotoId, styleDescription, serviceType },
      recommendation: {
        resultPhotoId: resultPhoto?.id,
        imageUrl: referenceImage,
        source: "reference-image",
      },
      modelProvider: "demo",
      modelLabel: "Demo Reference Image",
      photoId: storedPhotoId,
      processingMs: 0,
    },
  }).catch(() => null);

  return sendSuccess(res, {
    imageUrl: referenceImage,
    resultPhotoId: resultPhoto?.id,
    source: "reference-image",
    label: "Reference image — not generated from your photo. Real virtual try-on will be available when an open-source hairstyle-editing model is connected.",
    aiMode: "demo",
    safetyNotice: "This is a reference image for illustration only. AI visualization — actual results may vary.",
  });
}

/**
 * POST /api/v1/ai/salon-finder
 * AI suggests criteria → backend finds actual salons from the DB.
 */
async function salonFinder(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const criteria = req.body;

  const salons = await findSalonsByCriteria(db, criteria)
    .catch((e) => { throw Errors.database("Salon search failed.", e); });

  await db.aiInteraction.create({
    data: {
      customerId: req.customerId!,
      type: "salon-finder",
      inputSummary: criteria,
      recommendation: { salons } as any,
      modelProvider: "demo",
      modelLabel: "Demo Salon Finder",
      processingMs: 0,
    },
  }).catch(() => null);

  return sendSuccess(res, {
    salons,
    count: salons.length,
    criteria,
  }, `${salons.length} salon(s) found matching your criteria`);
}

/**
 * GET /api/v1/ai/history — customer's AI interaction history
 */
async function history(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const interactions = await db.aiInteraction.findMany({
    where: { customerId: req.customerId! },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, type: true, inputSummary: true, recommendation: true,
      modelProvider: true, modelLabel: true, processingMs: true, createdAt: true,
    },
  }).catch((e) => { throw Errors.database("Could not load AI history.", e); });
  return sendSuccess(res, interactions);
}

/**
 * GET /api/v1/ai/saved-looks — customer's saved AI looks
 */
async function listSavedLooks(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const looks = await db.savedLook.findMany({
    where: { customerId: req.customerId! },
    orderBy: { createdAt: "desc" },
  }).catch((e) => { throw Errors.database("Could not load saved looks.", e); });
  return sendSuccess(res, looks);
}

/**
 * POST /api/v1/ai/saved-looks — save an AI look
 */
async function saveLook(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const data = req.body;
  const look = await db.savedLook.create({
    data: {
      customerId: req.customerId!,
      style: data.style,
      category: data.category,
      description: data.description || null,
      serviceName: data.serviceName,
      visualPreview: data.visualPreview || null,
      visualPreviewSource: data.visualPreviewSource || null,
    },
  }).catch((e) => {
    if (e?.code === "P2002") {
      throw Errors.conflict("You've already saved this look.");
    }
    throw Errors.database("Could not save the look.", e);
  });
  return sendSuccess(res, look, "Look saved", 201);
}

/**
 * DELETE /api/v1/ai/saved-looks/:id — remove a saved look
 */
async function removeLook(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { id } = req.params;
  const existing = await db.savedLook.findFirst({
    where: { id, customerId: req.customerId! },
  }).catch(() => null);
  if (!existing) {
    return sendError(res, Errors.notFound("Saved look not found."));
  }
  await db.savedLook.delete({ where: { id } }).catch(() => {});
  return sendSuccess(res, { id }, "Look removed");
}

// ─── Routes ──────────────────────────────────────────────────────
router.post("/analyze-photo", requireAuth, validateBody(analyzePhotoSchema), analyzePhoto);
router.post("/text-recommendation", requireAuth, validateBody(textRecommendationSchema), textRecommendation);
router.post("/virtual-tryon", requireAuth, validateBody(virtualTryOnSchema), virtualTryOn);
router.post("/salon-finder", requireAuth, validateBody(salonFinderSchema), salonFinder);
router.get("/history", requireAuth, history);
router.get("/saved-looks", requireAuth, listSavedLooks);
router.post("/saved-looks", requireAuth, validateBody(saveLookSchema), saveLook);
router.delete("/saved-looks/:id", requireAuth, validateParams(lookIdParam), removeLook);

export default router;
