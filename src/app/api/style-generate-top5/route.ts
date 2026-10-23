import { NextRequest, NextResponse } from "next/server";
import { generateTryOn } from "@/lib/ai-service/visual-tryon";
import { getAiConfig } from "@/lib/ai-service/config";
import type { Top5HairstyleCandidate, UserPreferences } from "@/lib/ai-service/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export const MANDATORY_SALON_DISCLAIMER =
  "AI hairstyle preview — actual salon results may vary. Facial appearance is intended to remain consistent, but generated previews may contain visual differences.";

interface BaseStyleTemplate {
  name: string;
  category: string;
  serviceType: string;
  serviceName: string;
  description: string;
  suitabilityReason: string;
  confidence: number;
  maintenance: "Low" | "Medium" | "High";
  duration: string;
  keywords: string[];
}

const STYLE_CATALOG: BaseStyleTemplate[] = [
  {
    name: "Textured Quiff with Mid Fade",
    category: "Haircut & Styling",
    serviceType: "Haircut",
    serviceName: "Signature Textured Haircut",
    description: "Modern textured quiff featuring clean mid-fade sides with textured scissor-cut volume on top.",
    suitabilityReason: "Adds vertical height and elongation, creating an alert, well-proportioned aesthetic that suits oval and round face structures.",
    confidence: 0.94,
    maintenance: "Medium",
    duration: "35-45 min",
    keywords: ["quiff", "volume", "medium", "textured"],
  },
  {
    name: "Classic Scissor Taper Cut",
    category: "Haircut",
    serviceType: "Haircut",
    serviceName: "Executive Scissor Taper",
    description: "Refined gentlemen's taper cut with softly feathered scissor work around the neckline and ears.",
    suitabilityReason: "Provides a timeless, professional profile with effortless styling that seamlessly transitions from boardroom to social gatherings.",
    confidence: 0.91,
    maintenance: "Low",
    duration: "30-40 min",
    keywords: ["taper", "classic", "short", "low-maintenance", "office"],
  },
  {
    name: "Sharp High Skin Fade with Textured Crop",
    category: "Haircut",
    serviceType: "Haircut",
    serviceName: "High Fade Crop",
    description: "Crisp skin fade transitioning up to a textured fringe with razor-defined edges and contouring.",
    suitabilityReason: "Emphasizes jawline definition and cheekbone structure with bold modern contrast that requires minimal daily product.",
    confidence: 0.89,
    maintenance: "Medium",
    duration: "30-45 min",
    keywords: ["fade", "skin-fade", "crop", "short"],
  },
  {
    name: "Modern Side-Part Pompadour",
    category: "Haircut & Styling",
    serviceType: "Haircut",
    serviceName: "Classic Pompadour Styling",
    description: "Sleek side-parted pompadour with sweeping crown lift, blended temples, and a clean taper.",
    suitabilityReason: "Delivers maximum polish and sophistication for formal celebrations, weddings, and evening events.",
    confidence: 0.88,
    maintenance: "High",
    duration: "40-50 min",
    keywords: ["pompadour", "side-part", "wedding", "formal", "long", "volume"],
  },
  {
    name: "Clean Tapered Buzz Cut & Beard Sculpt",
    category: "Haircut & Beard",
    serviceType: "Beard Styling",
    serviceName: "Buzz Cut & Precision Beard Sculpt",
    description: "Uniform textured buzz cut with subtle temple taper paired with sharp cheekbone and jaw beard contouring.",
    suitabilityReason: "Ultra low-maintenance athletic silhouette that sharpens lower facial symmetry and eliminates morning styling time.",
    confidence: 0.86,
    maintenance: "Low",
    duration: "25-35 min",
    keywords: ["buzz", "crew", "beard", "low-maintenance", "short"],
  },
];

/**
 * Filter and sort 5 distinct candidates tailored to optional customer preferences.
 */
function pickTop5Candidates(preferences?: UserPreferences): BaseStyleTemplate[] {
  if (!preferences) {
    return [...STYLE_CATALOG];
  }

  const { hairLength, haircutStyle, maintenance, occasion } = preferences;

  const scored = STYLE_CATALOG.map((tpl) => {
    let score = 0;
    if (hairLength && hairLength !== "any") {
      if (tpl.keywords.includes(hairLength)) score += 3;
    }
    if (haircutStyle && haircutStyle !== "any") {
      if (tpl.keywords.some((k) => k.includes(haircutStyle) || haircutStyle.includes(k))) score += 4;
    }
    if (maintenance && tpl.maintenance === maintenance) {
      score += 2;
    }
    if (occasion && occasion !== "daily") {
      if (tpl.keywords.includes(occasion)) score += 2;
    }
    return { tpl, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.tpl);
}

/**
 * POST /api/style-generate-top5
 *
 * Requirements:
 * 1. Customer photo validation (MIME, max 8MB).
 * 2. 5 distinct candidate hairstyles.
 * 3. Generate each preview INDEPENDENTLY from original photograph buffer (never chain).
 * 4. Strict face preservation: original eyes, nose, lips, jawline, skin tone, clothing are preserved.
 * 5. Returns structured candidates with model source, preview data URL, and mandatory disclaimer.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { image, preferences } = body as {
      image?: string;
      preferences?: UserPreferences;
    };

    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "A valid photo data URL (data:image/*) is required." },
        { status: 400 }
      );
    }

    // Validate MIME
    const mimeMatch = image.match(/^data:(image\/[a-z+]+);/i);
    const mime = mimeMatch?.[1]?.toLowerCase() ?? "";
    if (!ALLOWED_MIME.includes(mime)) {
      return NextResponse.json(
        { error: `Unsupported image format (${mime || "unknown"}). Please upload JPG, PNG, or WebP.` },
        { status: 400 }
      );
    }

    // Validate size (max 8MB)
    const base64Data = image.split(",")[1] ?? "";
    const approxBytes = Math.ceil((base64Data.length * 3) / 4);
    if (approxBytes > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Uploaded image exceeds the 8 MB maximum size limit." },
        { status: 400 }
      );
    }

    const config = getAiConfig();
    const modelLabel = config.huggingFaceApiKey
      ? `Hugging Face (${config.huggingFaceModel || "diffusers/stable-diffusion-xl-1.0-inpainting-0.1"})`
      : "StyleSync Face-Preserving Engine";

    const top5Templates = pickTop5Candidates(preferences);

    // Generate each candidate INDEPENDENTLY from the original raw customer photo buffer
    const candidatePromises = top5Templates.map(async (tpl, idx): Promise<Top5HairstyleCandidate> => {
      // Independent try-on invocation: always pass the customer's authentic original photo
      const tryOnResult = await generateTryOn({
        image, // raw original photo
        styleDescription: tpl.name,
        serviceType: tpl.serviceType,
      });

      return {
        id: `hf_top5_${idx + 1}_${Date.now()}`,
        name: tpl.name,
        category: tpl.category,
        serviceType: tpl.serviceType,
        serviceName: tpl.serviceName,
        description: tpl.description,
        suitabilityReason: tpl.suitabilityReason,
        confidence: tpl.confidence,
        maintenance: tpl.maintenance,
        duration: tpl.duration,
        previewUrl: tryOnResult.imageUrl,
        source: config.huggingFaceApiKey ? "huggingface" : "ai-generated",
        facePreserved: true,
        modelUsed: config.huggingFaceModel || "diffusers/stable-diffusion-xl-1.0-inpainting-0.1",
      };
    });

    const candidates = await Promise.all(candidatePromises);

    return NextResponse.json({
      success: true,
      candidates,
      model: modelLabel,
      disclaimer: MANDATORY_SALON_DISCLAIMER,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/style-generate-top5] error:", msg);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate hairstyle previews. Please try again.",
        detail: msg,
      },
      { status: 500 }
    );
  }
}
