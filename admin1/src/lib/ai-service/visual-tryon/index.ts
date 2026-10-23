/**
 * Visual Try-On — entry point
 * --------------------------------------------------------------------
 * Picks DEMO or REAL implementation based on AI_MODE env var.
 * Falls back to DEMO if REAL is configured but the real model
 * server is unreachable / not yet connected.
 *
 * The user always sees a useful visual result — either a real
 * AI-generated preview (when configured) or a clearly-labeled
 * reference image (in demo mode).
 */

import type { VisualTryOnResult, TryOnRequest } from "../types";
import { getAiConfig } from "../config";
import { demoTryOn } from "./demo-tryon";
import { realTryOn } from "./real-tryon";

export async function generateTryOn(req: TryOnRequest): Promise<VisualTryOnResult> {
  const config = getAiConfig();
  if (config.isImageGenConfigured || config.mode === "real") {
    try {
      const result = await realTryOn(req);
      if (result && result.imageUrl) return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[ai-service] Real AI provider notice (falling back to style preview):", msg);
    }
  }
  return demoTryOn(req);
}

export type { VisualTryOnResult, TryOnRequest };
