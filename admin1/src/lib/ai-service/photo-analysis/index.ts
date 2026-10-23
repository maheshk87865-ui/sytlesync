/**
 * Photo Analysis — entry point
 * --------------------------------------------------------------------
 * Picks DEMO or REAL implementation based on AI_MODE env var.
 * Falls back to DEMO if REAL is configured but the real model
 * server is unreachable / not yet connected.
 */

import type { PhotoAnalysis, AnalyzeRequest } from "../types";
import { getAiConfig } from "../config";
import { analyzePhoto as demoAnalyze } from "./demo-analyzer";
import { analyzePhotoReal } from "./real-analyzer";

export async function analyzePhoto(imageDataUrl: string): Promise<PhotoAnalysis> {
  const config = getAiConfig();
  if (config.mode === "real") {
    try {
      const result = await analyzePhotoReal(imageDataUrl);
      if (result) return result;
    } catch (err) {
      // Real model not ready — fall through to demo analysis.
      console.warn("[ai-service] Real photo analysis failed, falling back to demo:", (err as Error).message);
    }
  }
  return demoAnalyze(imageDataUrl);
}

export async function analyzeRequest(req: AnalyzeRequest): Promise<PhotoAnalysis> {
  return analyzePhoto(req.image);
}

export type { PhotoAnalysis };
