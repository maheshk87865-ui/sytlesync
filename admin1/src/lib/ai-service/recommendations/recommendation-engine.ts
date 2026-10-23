/**
 * Recommendation Engine
 * --------------------------------------------------------------------
 * Combines:
 *   1. Real photo signals (hair color hint, skin tone, brightness)
 *   2. User's free-text request (parsed for keywords)
 *   3. User's selected preferences (occasion, maintenance, budget, time)
 *
 * Produces 4-6 personalized ServiceRecommendations spanning multiple
 * categories (Hair / Beard & Grooming / Skin & Beauty / Nails / Makeup).
 *
 * Each recommendation maps to a real StyleSync service category so
 * the "Find Salons" button returns actual salons from the database.
 *
 * No AI model is required for this — it's a deterministic engine
 * that uses the photo's real signals to bias the recommendations.
 */

import type { PhotoAnalysis, UserPreferences, ServiceRecommendation } from "../types";

interface Input {
  text?: string;
  preferences?: UserPreferences;
  photo?: PhotoAnalysis;
}

interface RecTemplate {
  style: string;
  category: string;
  serviceType: string;
  serviceName: string;
  reason: string;
  confidence: number;
  maintenance: "Low" | "Medium" | "High";
  duration: string;
  styleDescription: string;
}

/* Master library of recommendation templates — each maps to a real
   StyleSync service category. The engine picks 4-6 from this list
   based on photo signals + text + preferences. */
const LIBRARY: RecTemplate[] = [
  // ─── HAIR ──────────────────────────────────────────────────────────
  {
    style: "Textured Quiff",
    category: "Hair",
    serviceType: "Haircut",
    serviceName: "Signature Haircut",
    reason: "A textured quiff may suit your current hair length and adds volume on top while keeping the sides neat.",
    confidence: 0.85,
    maintenance: "Medium",
    duration: "30-45 min",
    styleDescription: "Volume on top with textured sides, modern quiff finish",
  },
  {
    style: "Classic Taper Cut",
    category: "Hair",
    serviceType: "Haircut",
    serviceName: "Classic Haircut",
    reason: "A clean taper cut may work well with your hair density and is easy to maintain between visits.",
    confidence: 0.82,
    duration: "30-45 min",
    maintenance: "Low",
    styleDescription: "Neat side-parted cut with tapered sides and structured top",
  },
  {
    style: "Low Fade + Textured Top",
    category: "Hair",
    serviceType: "Haircut",
    serviceName: "Skin Fade",
    reason: "A low fade with length on top may suit your preferences for a modern, edgy finish.",
    confidence: 0.78,
    duration: "30-45 min",
    maintenance: "Medium",
    styleDescription: "Skin fade on the sides with textured length on top",
  },
  {
    style: "Hair Spa & Wash",
    category: "Hair",
    serviceType: "Hair Spa",
    serviceName: "Hair Spa & Wash",
    reason: "A hair spa may suit your hair texture and add shine — recommended for scalp refreshment.",
    confidence: 0.72,
    duration: "30 min",
    maintenance: "Low",
    styleDescription: "Conditioning hair spa treatment with wash and scalp massage",
  },
  {
    style: "Global Hair Colour",
    category: "Hair",
    serviceType: "Hair Colour",
    serviceName: "Global Colour",
    reason: "A single-process colour may refresh your look — recommended when you want a noticeable change.",
    confidence: 0.68,
    duration: "90 min",
    maintenance: "Medium",
    styleDescription: "Full-coverage single-process hair colour in a natural shade",
  },
  {
    style: "Balayage Highlights",
    category: "Hair",
    serviceType: "Hair Colour",
    serviceName: "Balayage",
    reason: "Balayage may suit your hair length and adds dimensional colour without high maintenance.",
    confidence: 0.7,
    duration: "150 min",
    maintenance: "Medium",
    styleDescription: "Hand-painted balayage highlights blended naturally",
  },
  // ─── BEARD & GROOMING ──────────────────────────────────────────────
  {
    style: "Beard Sculpt",
    category: "Beard & Grooming",
    serviceType: "Beard Styling",
    serviceName: "Beard Shaping",
    reason: "A defined beard shape may complement your face structure and grooming preferences.",
    confidence: 0.8,
    duration: "20-30 min",
    maintenance: "Medium",
    styleDescription: "Defined beard shape with clean cheek and neck lines",
  },
  {
    style: "Short Boxed Beard",
    category: "Beard & Grooming",
    serviceType: "Beard Styling",
    serviceName: "Beard Shaping",
    reason: "A short boxed beard may suit your jawline and is easy to maintain between trims.",
    confidence: 0.75,
    duration: "20-30 min",
    maintenance: "Low",
    styleDescription: "Short boxed beard with sharp cheek lines",
  },
  {
    style: "Hot Towel Shave",
    category: "Beard & Grooming",
    serviceType: "Shaving",
    serviceName: "Hot Towel Shave",
    reason: "A traditional hot-towel shave may be a relaxing choice and gives a clean finish.",
    confidence: 0.7,
    duration: "30-40 min",
    maintenance: "Low",
    styleDescription: "Traditional straight-razor hot-towel shave",
  },
  // ─── SKIN & BEAUTY ─────────────────────────────────────────────────
  {
    style: "HydraFacial",
    category: "Skin & Beauty",
    serviceType: "Facial",
    serviceName: "Luxury Facial",
    reason: "A HydraFacial may refresh your skin — recommended for a clean, glowing look.",
    confidence: 0.82,
    duration: "45-60 min",
    maintenance: "Low",
    styleDescription: "Multi-step hydrating facial with extraction and serum infusion",
  },
  {
    style: "Fruit Cleanup",
    category: "Skin & Beauty",
    serviceType: "Cleanup",
    serviceName: "Fruit Cleanup",
    reason: "A fruit cleanup may suit your skin and is a quick refresh between deeper treatments.",
    confidence: 0.68,
    duration: "30 min",
    maintenance: "Low",
    styleDescription: "Gentle fruit-based cleanup with exfoliation and mask",
  },
  {
    style: "Anti-tan Facial",
    category: "Skin & Beauty",
    serviceType: "Facial",
    serviceName: "Anti-tan Facial",
    reason: "An anti-tan facial may help refresh your skin tone — recommended for outdoor lifestyles.",
    confidence: 0.74,
    duration: "45 min",
    maintenance: "Low",
    styleDescription: "De-tan facial with brightening mask and SPF finish",
  },
  // ─── NAILS ─────────────────────────────────────────────────────────
  {
    style: "Gel Manicure",
    category: "Nails",
    serviceType: "Manicure",
    serviceName: "Gel Manicure",
    reason: "A gel manicure may suit your preferences for long-lasting, clean nails.",
    confidence: 0.65,
    duration: "45 min",
    maintenance: "Low",
    styleDescription: "Gel polish manicure with shaped nails and cuticle care",
  },
  {
    style: "Pedicure Spa",
    category: "Nails",
    serviceType: "Pedicure",
    serviceName: "Pedicure Spa",
    reason: "A pedicure spa may be a relaxing add-on — recommended for overall grooming.",
    confidence: 0.62,
    duration: "45 min",
    maintenance: "Low",
    styleDescription: "Spa pedicure with soak, scrub, massage and polish",
  },
  // ─── MAKEUP ────────────────────────────────────────────────────────
  {
    style: "Party Glam",
    category: "Makeup",
    serviceType: "Makeup",
    serviceName: "Party Glam",
    reason: "Party glam makeup may suit your occasion preference — recommended for events.",
    confidence: 0.72,
    duration: "60 min",
    maintenance: "Medium",
    styleDescription: "Glam party makeup with defined eyes and contoured finish",
  },
  {
    style: "Bridal HD Makeup",
    category: "Makeup",
    serviceType: "Bridal Makeup",
    serviceName: "Bridal HD Makeup",
    reason: "Bridal HD makeup may suit wedding-ready preferences — recommended for the big day.",
    confidence: 0.78,
    duration: "90 min",
    maintenance: "High",
    styleDescription: "HD bridal makeup with long-lasting setting and defined features",
  },
];

function scoreTemplate(t: RecTemplate, input: Input): number {
  let score = t.confidence;
  const text = (input.text || "").toLowerCase();
  const prefs = input.preferences || {};
  const photo = input.photo;

  // Text keyword boosts
  const keywords: Record<string, string[]> = {
    "Haircut": ["haircut", "hair cut", "trim", "short", "long hair", "style"],
    "Hair Styling": ["styling", "style my hair", "updo", "set"],
    "Hair Colour": ["colour", "color", "highlight", "balayage", "global", "dye"],
    "Hair Spa": ["spa", "wash", "scalp", "treatment", "condition"],
    "Beard Styling": ["beard", "shape", "groom", "styling beard"],
    "Shaving": ["shave", "shaving", "clean shave", "hot towel"],
    "Facial": ["facial", "skin", "dull", "glow", "hydrate", "hydrating"],
    "Cleanup": ["cleanup", "clean up", "exfoliate"],
    "Manicure": ["manicure", "nails", "nail"],
    "Pedicure": ["pedicure", "feet", "spa pedicure"],
    "Makeup": ["makeup", "party", "glam", "look"],
    "Bridal Makeup": ["bridal", "bride", "wedding", "bridal makeup"],
  };
  const kws = keywords[t.serviceType] || [];
  for (const kw of kws) {
    if (text.includes(kw)) {
      score += 0.18;
      break;
    }
  }

  // Preference boosts
  if (prefs.occasion === "wedding" && t.serviceType === "Bridal Makeup") score += 0.20;
  if (prefs.occasion === "party" && t.serviceType === "Makeup") score += 0.15;
  if (prefs.occasion === "office" && t.category === "Hair") score += 0.08;
  if (prefs.maintenance === "Low" && t.maintenance === "Low") score += 0.08;
  if (prefs.maintenance === "High" && t.maintenance === "High") score += 0.06;
  if (prefs.timeAvailable === "under-30" && t.duration.includes("30 min")) score += 0.06;
  if (prefs.timeAvailable === "60-plus" && (t.duration.includes("90") || t.duration.includes("150"))) score += 0.06;

  // Photo-signal boosts — only when we have real photo analysis
  if (photo) {
    // If the top region (hair area) is dark, beard services may complement well
    if (photo.hairColorHint === "dark" && t.category === "Beard & Grooming") score += 0.05;
    // If we detected skin tones, facial/cleanup services are relevant
    if (photo.skinToneDetected && (t.serviceType === "Facial" || t.serviceType === "Cleanup")) score += 0.06;
    // If the image is well-lit/bright (likely a clear selfie), confidence is higher overall
    if (photo.brightnessLabel === "well-lit" || photo.brightnessLabel === "bright") score += 0.03;
    // If the image is dim, lower confidence slightly (less signal)
    if (photo.brightnessLabel === "dim") score -= 0.04;
  }

  return score;
}

function dedupeByCategory(recs: ServiceRecommendation[], maxPerCategory: number = 2): ServiceRecommendation[] {
  const counts: Record<string, number> = {};
  const result: ServiceRecommendation[] = [];
  for (const r of recs) {
    if ((counts[r.category] || 0) >= maxPerCategory) continue;
    counts[r.category] = (counts[r.category] || 0) + 1;
    result.push(r);
  }
  return result;
}

export function generateRecommendations(input: Input): ServiceRecommendation[] {
  // Score every template
  const scored = LIBRARY.map((t) => ({ t, score: scoreTemplate(t, input) }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top candidates and convert to ServiceRecommendation shape
  const top = scored.slice(0, 8);
  const recs: ServiceRecommendation[] = top.map(({ t, score }, idx) => ({
    style: t.style,
    category: t.category,
    serviceName: t.serviceName,
    serviceType: t.serviceType,
    reason: t.reason,
    confidence: Math.min(0.99, Math.max(0.4, score)),
    maintenance: t.maintenance,
    duration: t.duration,
    styleDescription: t.styleDescription,
    visualPreview: undefined,
    visualPreviewSource: undefined,
    tryOnAvailable: true,
    source: "demo-engine",
  }));

  // Ensure we span multiple categories (max 2 per category)
  const varied = dedupeByCategory(recs, 2);

  // Return 4-6 recommendations
  return varied.slice(0, 6);
}
