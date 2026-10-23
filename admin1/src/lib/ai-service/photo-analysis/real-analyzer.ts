/**
 * Real Photo Analyzer — Open-source model adapter (placeholder)
 * --------------------------------------------------------------------
 * This file is a thin adapter that, when AI_MODE=real is set, would
 * call an open-source vision-language model (Qwen2.5-VL, Llama 4
 * Scout, Gemma 3, LLaVA, etc.) running locally (e.g. via Ollama).
 *
 * No paid API is used. The endpoint is configured via the
 * AI_VISION_ENDPOINT env var.
 *
 * To enable:
 *   1. Set AI_MODE=real in .env
 *   2. Run a local model server, e.g.:
 *      `ollama run qwen2.5vl:7b`
 *   3. Set AI_VISION_ENDPOINT=http://localhost:11434/api/generate
 *
 * The current implementation throws a clear "not configured" error
 * so the calling code can fall back to demo analysis gracefully.
 */

import type { PhotoAnalysis } from "../types";
import { getAiConfig } from "../config";

export async function analyzePhotoReal(imageDataUrl: string): Promise<PhotoAnalysis> {
  const config = getAiConfig();
  if (!config.realVisionEndpoint) {
    throw new Error("Real AI vision endpoint is not configured. Set AI_VISION_ENDPOINT.");
  }

  // ----------------------------------------------------------------
  // FUTURE IMPLEMENTATION — call your open-source vision model here.
  // The adapter returns the same PhotoAnalysis shape so the rest of
  // the pipeline (recommendations, try-on) doesn't change.
  // ----------------------------------------------------------------
  //
  // Example call to Ollama running Qwen2.5-VL:
  //
  // const response = await fetch(config.realVisionEndpoint, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     model: "qwen2.5vl:7b",
  //     prompt: "Describe this person's hair length, hair color, beard presence, and general grooming in one short paragraph. Do not make medical claims.",
  //     images: [imageDataUrl.split(",")[1]],
  //     stream: false,
  //   }),
  // });
  // const data = await response.json();
  // const description = data.response || "";
  // ...parse description into PhotoAnalysis fields...
  //
  // ----------------------------------------------------------------

  // Until a real model server is configured, throw so the caller can
  // fall back to demo analysis. This makes the "not working" state
  // obvious instead of silently producing fake output.
  throw new Error(
    "Real AI vision model is not yet connected. " +
    "Configure AI_VISION_ENDPOINT and AI_MODE=real to enable. " +
    "Falling back to demo pixel-analysis mode."
  );
}
