import { NextRequest, NextResponse } from "next/server";
import { analyzePhoto } from "@/lib/ai-service/photo-analysis";
import { generateRecommendations } from "@/lib/ai-service/recommendations/recommendation-engine";
import { getAiConfig } from "@/lib/ai-service/config";
import type { ServiceRecommendation } from "@/lib/ai-service/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { image, text, preferences } = body as {
      image?: string;
      text?: string;
      preferences?: Record<string, string>;
    };

    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid data:image/* URL is required." }, { status: 400 });
    }

    const mimeMatch = image.match(/^data:(image\/[a-z+]+);/i);
    const mime = mimeMatch?.[1]?.toLowerCase() ?? "";
    if (!ALLOWED_MIME.includes(mime)) {
      return NextResponse.json(
        { error: `Unsupported image format. Please upload JPG, PNG or WEBP. Got ${mime || "unknown"}.` },
        { status: 400 }
      );
    }

    const base64Data = image.split(",")[1] ?? "";
    const approxBytes = Math.ceil((base64Data.length * 3) / 4);
    if (approxBytes > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Image is too large (${(approxBytes / 1024 / 1024).toFixed(1)} MB). Maximum 8 MB.` },
        { status: 400 }
      );
    }

    // ─── Stage 1: Photo analysis ────────────────────────────────────
    // Real pixel-level analysis (sharp) — no paid API required.
    // In real mode, this would call an open-source vision model.
    let photoAnalysis;
    try {
      photoAnalysis = await analyzePhoto(image);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Photo analysis failed";
      console.error("[/api/style-analyze] photo analysis error:", msg);
      return NextResponse.json(
        { error: "Could not analyze the uploaded photo. Please try a clearer image." },
        { status: 422 }
      );
    }

    // ─── Stage 2: Recommendations ───────────────────────────────────
    // Combine photo signals + user text + preferences to produce
    // 4-6 personalized recommendations across multiple categories.
    const recs = generateRecommendations({
      text,
      preferences: preferences as any,
      photo: photoAnalysis,
    });

    if (recs.length === 0) {
      return NextResponse.json(
        { error: "Could not generate any recommendations from this photo. Try a clearer photo or add a text description." },
        { status: 422 }
      );
    }

    // ─── Return result ──────────────────────────────────────────────
    // The frontend uses `source` to label whether the result came from
    // the demo engine or a real AI model. In demo mode, recommendations
    // use reference images (clearly labeled), not AI-generated images.
    const config = getAiConfig();
    const response: {
      recommendations: ServiceRecommendation[];
      photoAnalysis: typeof photoAnalysis;
      aiMode: string;
      aiModelLabel?: string;
    } = {
      recommendations: recs,
      photoAnalysis,
      aiMode: config.mode,
    };
    if (config.mode === "real" && config.realModelLabel) {
      response.aiModelLabel = config.realModelLabel;
    }

    return NextResponse.json(response);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/style-analyze] error:", msg);
    return NextResponse.json(
      { error: "AI analysis failed. Please try again.", detail: msg },
      { status: 500 }
    );
  }
}
