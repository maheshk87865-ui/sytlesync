/**
 * Demo Photo Analyzer
 * --------------------------------------------------------------------
 * Extracts REAL signals from the uploaded photo using `sharp` (no AI
 * model required). This is not fake analysis — we genuinely read the
 * pixels, compute brightness / color distribution, sample the top
 * region (typically the hair area) and the center region (typically
 * the face area), and detect whether skin-tone colors are present.
 *
 * These signals are combined with the user's text request + selected
 * preferences by the recommendation engine to produce personalized
 * service recommendations.
 *
 * No paid API key is required. No external network call is made.
 */

import sharp from "sharp";
import type { PhotoAnalysis } from "../types";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function luminance(r: number, g: number, b: number): number {
  // Standard perceptual luminance formula
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function classifyHairColor(topR: number, topG: number, topB: number): PhotoAnalysis["hairColorHint"] {
  const lum = luminance(topR, topG, topB);
  if (lum < 60) return "dark";
  if (lum < 140) return "medium";
  if (lum < 200) return "light";
  return "light";
}

function detectSkinTone(r: number, g: number, b: number): boolean {
  // A simple skin-tone heuristic: red > green > blue, and red is in
  // a warm range. Works for many skin tones across the spectrum.
  return r > 95 && r < 250 && g > 40 && g < 230 && b > 20 && b < 200 && r > g && g > b;
}

export async function analyzePhoto(imageDataUrl: string): Promise<PhotoAnalysis> {
  // Strip the data: prefix and decode base64
  const base64 = imageDataUrl.split(",")[1] || "";
  if (!base64) {
    throw new Error("Invalid image data URL");
  }
  const buffer = Buffer.from(base64, "base64");

  // Use sharp to get raw pixel data (resize to a small thumbnail for speed)
  const THUMB_SIZE = 80;
  const thumbBuffer = await sharp(buffer)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer();
  const { info } = await sharp(buffer).metadata().then((m) => ({ info: m })).catch(() => ({ info: null as any }));
  const originalWidth = info?.width || THUMB_SIZE;
  const originalHeight = info?.height || THUMB_SIZE;

  // Compute overall stats
  let sumR = 0, sumG = 0, sumB = 0;
  let pixelCount = 0;
  let skinPixels = 0;
  let warmPixels = 0;

  // Region accumulators (top = hair, center = face)
  let topR = 0, topG = 0, topB = 0, topCount = 0;
  let centerR = 0, centerG = 0, centerB = 0, centerCount = 0;

  const totalPixels = thumbBuffer.length / 3;
  const TOP_REGION_END = Math.floor(totalPixels * 0.30);   // top 30% of pixels
  const CENTER_START = Math.floor(totalPixels * 0.35);
  const CENTER_END = Math.floor(totalPixels * 0.65);

  for (let i = 0; i < thumbBuffer.length; i += 3) {
    const r = thumbBuffer[i];
    const g = thumbBuffer[i + 1];
    const b = thumbBuffer[i + 2];
    sumR += r; sumG += g; sumB += b;
    pixelCount++;
    if (detectSkinTone(r, g, b)) skinPixels++;
    if (r > g && r > b) warmPixels++;

    const pixelIdx = i / 3;
    if (pixelIdx < TOP_REGION_END) {
      topR += r; topG += g; topB += b; topCount++;
    } else if (pixelIdx >= CENTER_START && pixelIdx < CENTER_END) {
      centerR += r; centerG += g; centerB += b; centerCount++;
    }
  }

  const avgR = sumR / pixelCount;
  const avgG = sumG / pixelCount;
  const avgB = sumB / pixelCount;
  const avgLum = luminance(avgR, avgG, avgB);

  const topAvgR = topR / (topCount || 1);
  const topAvgG = topG / (topCount || 1);
  const topAvgB = topB / (topCount || 1);

  const centerAvgR = centerR / (centerCount || 1);
  const centerAvgG = centerG / (centerCount || 1);
  const centerAvgB = centerB / (centerCount || 1);

  const skinToneDetected = skinPixels / totalPixels > 0.04;   // at least 4% skin-tone pixels
  const warmPalette = warmPixels / totalPixels > 0.5;

  let brightnessLabel: PhotoAnalysis["brightnessLabel"] = "well-lit";
  if (avgLum < 70) brightnessLabel = "dim";
  else if (avgLum > 180) brightnessLabel = "bright";

  return {
    width: originalWidth,
    height: originalHeight,
    dominantColor: rgbToHex(avgR, avgG, avgB),
    averageBrightness: Math.round(avgLum),
    brightnessLabel,
    hairColorHint: classifyHairColor(topAvgR, topAvgG, topAvgB),
    skinToneDetected,
    warmPalette,
    topRegionColor: rgbToHex(topAvgR, topAvgG, topAvgB),
    centerRegionColor: rgbToHex(centerAvgR, centerAvgG, centerAvgB),
    source: "demo-pixel-analysis",
  };
}
