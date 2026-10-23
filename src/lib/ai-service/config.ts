/**
 * AI Service — Mode Configuration
 * --------------------------------------------------------------------
 * Picks between DEMO mode (no AI model, runs entirely on free
 * heuristics + StyleSync service data) and REAL mode (calls an
 * open-source multimodal model server).
 *
 * REAL mode is ready to be enabled — just set the env vars below
 * and provide a model server endpoint (e.g. Ollama running
 * Qwen2.5-VL on http://localhost:11434).
 *
 * No paid API key is ever required.
 */

export type AiMode = "demo" | "real";

export interface AiConfig {
  mode: AiMode;
  /* Real-mode endpoint for the vision model (e.g. Ollama) */
  realVisionEndpoint?: string;
  /* Real-mode endpoint for image editing / generation (e.g. ComfyUI / custom server) */
  realTryOnEndpoint?: string;
  /* Replicate API Token for cloud inpainting */
  replicateApiToken?: string;
  /* Replicate model name or version (optional, e.g. stability-ai/stable-diffusion-inpainting) */
  replicateModel?: string;
  /* Stability AI API Key */
  stabilityApiKey?: string;
  /* Google Gemini API Key for multimodal analysis and Imagen try-on */
  geminiApiKey?: string;
  /* OpenAI API Key for DALL-E / inpainting */
  openaiApiKey?: string;
  /* Hugging Face API Key / User Access Token */
  huggingFaceApiKey?: string;
  /* Hugging Face Model (e.g. diffusers/stable-diffusion-xl-1.0-inpainting-0.1 or ahmdliaqat/Stable-Hair) */
  huggingFaceModel?: string;
  /* Hugging Face Inference Endpoint URL */
  huggingFaceEndpoint?: string;
  /* Model label shown in the UI when real mode is active */
  realModelLabel?: string;
  /* Whether any real image generation provider is configured */
  isImageGenConfigured: boolean;
}

function readEnv(name: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const val = process.env[name];
  return val ? val.trim() : undefined;
}

export function getAiConfig(): AiConfig {
  const hfToken = readEnv("HUGGINGFACE_API_KEY") || readEnv("HF_TOKEN");
  const hfModel = readEnv("HUGGINGFACE_MODEL") || readEnv("HF_MODEL") || "timbrooks/instruct-pix2pix";
  const hfEndpoint = readEnv("HUGGINGFACE_ENDPOINT") || readEnv("HF_ENDPOINT");
  const replicateToken = readEnv("REPLICATE_API_TOKEN");
  const replicateModel = readEnv("REPLICATE_MODEL");
  const stabilityKey = readEnv("STABILITY_API_KEY");
  const geminiKey = readEnv("GEMINI_API_KEY");
  const openaiKey = readEnv("OPENAI_API_KEY");
  const customEndpoint = readEnv("AI_TRYON_ENDPOINT");
  const isImageGenConfigured = Boolean(hfToken || replicateToken || stabilityKey || geminiKey || openaiKey || customEndpoint);

  const mode = (readEnv("AI_MODE") || (isImageGenConfigured ? "real" : "demo")).toLowerCase() === "real" ? "real" : "demo";

  return {
    mode,
    realVisionEndpoint: readEnv("AI_VISION_ENDPOINT"),
    realTryOnEndpoint: customEndpoint,
    huggingFaceApiKey: hfToken,
    huggingFaceModel: hfModel,
    huggingFaceEndpoint: hfEndpoint,
    replicateApiToken: replicateToken,
    replicateModel,
    stabilityApiKey: stabilityKey,
    geminiApiKey: geminiKey,
    openaiApiKey: openaiKey,
    realModelLabel: readEnv("AI_MODEL_LABEL") || (isImageGenConfigured ? (hfToken ? `Hugging Face (${hfModel})` : "StyleSync AI Hairstyle Engine") : undefined),
    isImageGenConfigured,
  };
}

export function isDemoMode(): boolean {
  return getAiConfig().mode === "demo";
}

export function isRealMode(): boolean {
  return getAiConfig().mode === "real";
}
