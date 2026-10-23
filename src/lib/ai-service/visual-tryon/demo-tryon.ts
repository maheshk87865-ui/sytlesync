/**
 * Demo Visual Try-On
 * --------------------------------------------------------------------
 * In demo mode we do NOT pretend to generate a new image from the
 * user's face — instead we return a relevant reference image from
 * the existing /salons/ folder. The frontend labels this clearly as
 * "Reference image — not generated from your photo".
 *
 * The architecture is ready for a real open-source image editing
 * model (e.g. a fine-tuned Stable Diffusion inpainting model) to
 * be plugged in later via real-tryon.ts.
 */

import type { VisualTryOnResult, TryOnRequest } from "../types";
import { blendHairstyleOntoUserFace } from "./face-blender";

export async function demoTryOn(req: TryOnRequest): Promise<VisualTryOnResult> {
  const desc = (req.styleDescription || "").toLowerCase();

  let img = "/hairstyles/textured-quiff.jpg";
  if (desc.includes("quiff")) {
    img = "/hairstyles/textured-quiff.jpg";
  } else if (desc.includes("taper")) {
    img = "/hairstyles/classic-taper.jpg";
  } else if (desc.includes("fade")) {
    img = "/hairstyles/skin-fade.jpg";
  } else if (desc.includes("beard")) {
    img = "/hairstyles/beard-sculpt.jpg";
  } else if (desc.includes("facial") || desc.includes("hydra")) {
    img = "/hairstyles/hydrafacial.jpg";
  } else if (desc.includes("buzz") || desc.includes("crew")) {
    img = "/hairstyles/buzz-cut.jpg";
  } else if (desc.includes("pompadour") || desc.includes("side-part") || desc.includes("part")) {
    img = "/hairstyles/pompadour.jpg";
  } else if (desc.includes("colour") || desc.includes("balayage") || desc.includes("highlight")) {
    img = "/hairstyles/pompadour.jpg";
  } else if (desc.includes("long") || desc.includes("wave")) {
    img = "/hairstyles/textured-quiff.jpg";
  }

  return {
    imageUrl: img,
    source: "reference-image",
    label: `Reference Style — ${req.styleDescription || "Preview"} (Enter your Hugging Face API token in .env for custom AI transformation)`,
  };
}
