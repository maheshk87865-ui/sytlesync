import { NextRequest, NextResponse } from "next/server";
import { generateTryOn } from "@/lib/ai-service/visual-tryon";
import { getAiConfig } from "@/lib/ai-service/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

/**
 * POST /api/style-tryon
 *
 * Body: { image: string (data URL), styleDescription: string, serviceType?: string }
 * Returns: { imageUrl: string, source: "reference-image" | "ai-generated", label: string }
 *
 * Architecture:
 *   - In DEMO mode (default): returns a relevant reference image from
 *     /salons/, clearly labeled as "Reference image — not generated
 *     from your photo".
 *   - In REAL mode (when AI_MODE=real and AI_TRYON_ENDPOINT is set):
 *     would call an open-source image editing model (e.g. SD inpainting)
 *     that preserves the person's identity and modifies only the
 *     hairstyle/beard/service-related appearance.
 *
 * The UI must always show "AI visualization — actual results may vary"
 * when source is "ai-generated".
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { image, styleDescription, serviceType } = body as {
      image?: string;
      styleDescription?: string;
      serviceType?: string;
    };

    if (!image || !image.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid data:image/* URL is required." }, { status: 400 });
    }

    if (!styleDescription || typeof styleDescription !== "string") {
      return NextResponse.json({ error: "styleDescription is required." }, { status: 400 });
    }

    // Validate MIME
    const mimeMatch = image.match(/^data:(image\/[a-z+]+);/i);
    const mime = mimeMatch?.[1]?.toLowerCase() ?? "";
    if (!ALLOWED_MIME.includes(mime)) {
      return NextResponse.json(
        { error: `Unsupported image format. Got ${mime || "unknown"}.` },
        { status: 400 }
      );
    }

    // Validate size
    const base64Data = image.split(",")[1] ?? "";
    const approxBytes = Math.ceil((base64Data.length * 3) / 4);
    if (approxBytes > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image too large. Maximum 8 MB." }, { status: 400 });
    }

    const result = await generateTryOn({ image, styleDescription, serviceType });
    const config = getAiConfig();
    const isSuccess = Boolean(result.imageUrl);

    return NextResponse.json({
      success: isSuccess,
      imageUrl: result.imageUrl,
      source: result.source,
      label: result.label,
      aiMode: config.mode,
      isConfigured: config.isImageGenConfigured,
      error: !isSuccess ? (result.errorMessage || result.label) : undefined,
      errorMessage: result.errorMessage,
    }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/style-tryon] error:", msg);
    return NextResponse.json(
      { error: "Visual try-on failed. Please try again.", detail: msg },
      { status: 500 }
    );
  }
}
