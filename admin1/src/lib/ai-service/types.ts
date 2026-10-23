/**
 * AI Service — Shared Types
 * --------------------------------------------------------------------
 * The AI feature in StyleSync is split into three logical stages:
 *
 *   1. Photo analysis   — extract observable signals from the photo
 *   2. Recommendations  — combine photo + text + preferences → services
 *   3. Visual try-on     — produce a BEFORE/AFTER preview
 *
 * Each stage has a DEMO implementation (no AI model required) and a
 * REAL implementation (calls an open-source multimodal model). The
 * active implementation is chosen by `config.ts` based on env vars.
 *
 * Open-source models that the REAL layer is designed for:
 *   - Qwen2.5-VL (vision-language)
 *   - Llama 4 Scout / Maverick
 *   - Gemma 3
 *   - LLaVA
 *
 * The REAL layer is a thin adapter — to plug in a real model, replace
 * the placeholder fetch with a call to your local model server (e.g.
 * `http://localhost:11434/api/generate` for Ollama running Qwen2.5-VL).
 */

export interface PhotoAnalysis {
  /* Real signals extracted from the image (no AI model needed) */
  width: number;
  height: number;
  dominantColor: string;            // hex
  averageBrightness: number;        // 0..255
  brightnessLabel: "dim" | "well-lit" | "bright";
  /* Heuristic hints derived from color sampling */
  hairColorHint: "dark" | "medium" | "light" | "unknown";
  skinToneDetected: boolean;
  warmPalette: boolean;
  /* Region samples (top = hair area, center = face area) */
  topRegionColor: string;
  centerRegionColor: string;
  /* Source indicator — frontend uses this to label the output */
  source: "demo-pixel-analysis" | "real-ai-model";
  modelLabel?: string;              // e.g. "Qwen2.5-VL" for real mode
}

export interface UserPreferences {
  hairLength?: "short" | "medium" | "long" | "any";
  hairTexture?: "straight" | "wavy" | "curly" | "coily" | "any";
  haircutStyle?: "fade" | "quiff" | "taper" | "buzz" | "pompadour" | "side-part" | "classic" | "any";
  hairColor?: "natural" | "black" | "dark-brown" | "blonde" | "ash-grey" | "burgundy" | "any";
  occasion?: "daily" | "office" | "wedding" | "party" | "date" | "event" | "casual";
  maintenance?: "Low" | "Medium" | "High";
  budget?: "$" | "$$" | "$$$";
  timeAvailable?: "under-30" | "30-60" | "60-plus";
}

export interface Top5HairstyleCandidate {
  id: string;
  name: string;
  category: string;
  serviceType: string;
  serviceName: string;
  description: string;
  suitabilityReason: string;
  confidence: number;
  maintenance: "Low" | "Medium" | "High";
  duration: string;
  previewUrl: string;
  source: "huggingface" | "ai-generated" | "reference-image";
  facePreserved: boolean;
  modelUsed: string;
}

export interface Top5GenerateRequest {
  image: string; // customer photo data URL
  preferences?: UserPreferences;
}

export interface Top5GenerateResponse {
  success: boolean;
  candidates: Top5HairstyleCandidate[];
  model: string;
  disclaimer: string;
  error?: string;
}

export interface ServiceRecommendation {
  /* Display fields */
  style: string;                    // e.g. "Textured Quiff"
  category: string;                 // e.g. "Haircut"
  serviceName: string;              // e.g. "Signature Haircut"
  serviceType: string;             // matches existing StyleSync service names
  reason: string;                   // "May suit your current hair length…"
  confidence: number;              // 0..1
  maintenance: "Low" | "Medium" | "High";
  duration?: string;                // "30-45 min"
  /* Visual try-on */
  visualPreview?: string;          // data URL or /salons/... path
  visualPreviewSource?: "reference-image" | "ai-generated" | "unavailable";
  styleDescription?: string;       // text description for future try-on prompt
  tryOnAvailable: boolean;
  /* Frontend hint about whether this came from real AI or demo engine */
  source: "demo-engine" | "real-ai-model";
}

export interface VisualTryOnResult {
  imageUrl: string;                // data URL or /salons/... path
  source: "reference-image" | "ai-generated" | "unavailable";
  label: string;                   // e.g. "Reference image — not generated from your photo"
  errorMessage?: string;
}

export interface AnalyzeRequest {
  image: string;                   // data URL
  text?: string;
  preferences?: UserPreferences;
}

export interface TryOnRequest {
  image: string;                   // data URL of user's photo
  styleDescription: string;
  serviceType?: string;
}

export const DEMO_REFERENCE_IMAGES: Record<string, string[]> = {
  "Haircut":            ["/salons/salon-13.jpg", "/salons/salon-14.png", "/salons/salon-15.jpeg"],
  "Hair Styling":       ["/salons/salon-16.jpg", "/salons/salon-17.jpg"],
  "Hair Colour":        ["/salons/salon-18.jpg", "/salons/salon-13.jpg"],
  "Beard Styling":      ["/salons/salon-01.jpeg", "/salons/salon-02.jpg"],
  "Beard Trim":         ["/salons/salon-03.jpg", "/salons/salon-04.jpg"],
  "Shaving":            ["/salons/salon-05.jpg", "/salons/salon-06.jpeg"],
  "Facial":             ["/salons/salon-07.jpg", "/salons/salon-08.jpg"],
  "Cleanup":            ["/salons/salon-09.jpg", "/salons/salon-10.jpg"],
  "Makeup":             ["/salons/salon-19.png", "/salons/salon-20.jpg"],
  "Bridal Makeup":      ["/salons/salon-21.jpg", "/salons/salon-22.jpg"],
  "Nails":              ["/salons/salon-24.jpg", "/salons/salon-25.jpg"],
  "default":            ["/salons/salon-29.jpg", "/salons/salon-30.jpg"],
};

export function getReferenceImage(serviceType: string, idx: number = 0): string {
  const pool = DEMO_REFERENCE_IMAGES[serviceType] || DEMO_REFERENCE_IMAGES.default;
  return pool[idx % pool.length];
}
