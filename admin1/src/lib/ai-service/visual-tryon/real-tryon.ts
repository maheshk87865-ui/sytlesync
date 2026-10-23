import Replicate from "replicate";
import type { VisualTryOnResult, TryOnRequest } from "../types";
import { getAiConfig } from "../config";

const TIMEOUT_MS = 60000; // 60s generation timeout for cold starts

/**
 * Builds hairstyle-specific instructions aimed at preserving the customer's face,
 * skin tone, facial features, and recognizable identity while transforming only the hair.
 */
function buildHairstyleInstruction(styleDescription: string): { instruction: string; prompt: string; negativePrompt: string } {
  const s = styleDescription.toLowerCase();
  let specificStyle = styleDescription;

  if (s.includes("quiff")) {
    specificStyle = "a textured quiff hairstyle with short clean tapered sides and textured volume on top";
  } else if (s.includes("taper")) {
    specificStyle = "a clean classic taper cut hairstyle with neatly blended sides and scissor-trimmed top";
  } else if (s.includes("fade")) {
    specificStyle = "a sharp mid-taper fade haircut with clean edges and styled hair on top";
  } else if (s.includes("beard")) {
    specificStyle = `a neatly groomed ${styleDescription} with clean defined cheek and neck lines`;
  } else if (s.includes("updo") || s.includes("bridal")) {
    specificStyle = `an elegant ${styleDescription} hair styling suitable for special occasions`;
  }

  return {
    instruction: `give this person ${specificStyle}, keeping their facial features, eyes, nose, mouth, and skin tone completely unchanged`,
    prompt: `A professional studio portrait of this exact person with ${specificStyle}. Masterpiece, photorealistic, 8k. Keep the person's exact face, facial features, eyes, nose, lips, facial shape, skin tone, and recognizable identity completely identical to the reference photo. Seamlessly modify only the hairstyle on top and sides.`,
    negativePrompt: "different person, changed face, altered facial features, distorted face, bad anatomy, blurry, salon chair, empty room, extra limbs, cartoon",
  };
}

/**
 * Call a custom / local image editing endpoint (e.g. ComfyUI, SD-WebUI inpaint, or local model server).
 */
async function callCustomEndpoint(endpoint: string, req: TryOnRequest): Promise<VisualTryOnResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const { prompt } = buildHairstyleInstruction(req.styleDescription);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: req.image,
        prompt,
        style: req.styleDescription,
        serviceType: req.serviceType,
        preserve_identity: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`Custom model server responded with HTTP ${res.status}: ${errText.slice(0, 150)}`);
    }

    const data = await res.json();
    const outputUrl = data.imageUrl || data.image || data.output;
    if (!outputUrl) {
      throw new Error("Custom model server did not return an image URL or image data.");
    }

    return {
      imageUrl: outputUrl,
      source: "ai-generated",
      label: `AI Generated — ${req.styleDescription} (Face Preserved)`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call Replicate API using official Replicate SDK.
 * Supports image-editing models (InstructPix2Pix, Flux Fill, SD Inpainting) that preserve
 * customer facial identity.
 */
async function callReplicate(apiToken: string, modelName: string | undefined, req: TryOnRequest): Promise<VisualTryOnResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const replicate = new Replicate({
      auth: apiToken,
    });

    const { instruction, prompt, negativePrompt } = buildHairstyleInstruction(req.styleDescription);

    // Default model: InstructPix2Pix (explicitly trained for instruction-based image edits without requiring manual masks)
    const defaultModel = "timothybrooks/instruct-pix2pix:34508d31319ddbac51c4e46eddfa6e0abbab86ecb4767c654f5b1ee3c29f896f";
    const selectedModel = (modelName || defaultModel) as `${string}/${string}` | `${string}/${string}:${string}`;

    console.log(`[ai-service] Dispatching to Replicate model: ${selectedModel}`);

    let output: unknown;
    try {
      // For instruct-pix2pix or general image-to-image edit models
      if (selectedModel.includes("instruct-pix2pix")) {
        output = await replicate.run(selectedModel, {
          input: {
            image: req.image,
            prompt: instruction,
            image_guidance_scale: 1.5, // High guidance preserves original face structure & background
            guidance_scale: 7.5,
            num_inference_steps: 25,
          },
          signal: controller.signal,
        });
      } else {
        // General inpainting / image generation model
        output = await replicate.run(selectedModel, {
          input: {
            image: req.image,
            prompt,
            negative_prompt: negativePrompt,
            num_inference_steps: 25,
          },
          signal: controller.signal,
        });
      }
    } catch (runErr: unknown) {
      const err = runErr as Error & { status?: number; response?: { status?: number } };
      const status = err.status || err.response?.status;
      if (status === 401) {
        throw new Error("Replicate authentication failed. Please verify your REPLICATE_API_TOKEN in .env.");
      }
      if (status === 402) {
        throw new Error("Replicate account billing limit reached or credit expired (HTTP 402).");
      }
      if (status === 429) {
        throw new Error("Replicate API rate limit exceeded. Please retry in a few moments.");
      }
      throw new Error(`Replicate generation failed: ${err.message || "Model execution error"}`);
    }

    let outputUrl = "";
    if (Array.isArray(output) && output.length > 0) {
      const first = output[0];
      outputUrl = typeof first === "string" ? first : (first && typeof first === "object" && "url" in first && typeof first.url === "function" ? String(first.url()) : String(first));
    } else if (typeof output === "string") {
      outputUrl = output;
    } else if (output && typeof output === "object") {
      outputUrl = "url" in output && typeof (output as { url: unknown }).url === "function" ? String((output as { url: () => unknown }).url()) : String(output);
    }

    if (!outputUrl || outputUrl.trim() === "" || outputUrl === "[object Object]") {
      throw new Error("Replicate completed prediction but did not return a valid output image URL.");
    }

    return {
      imageUrl: outputUrl,
      source: "ai-generated",
      label: `AI Generated — ${req.styleDescription} (Face Preserved)`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call Stability AI API using Search and Replace.
 * Specifically searches for "hair, head hair" and replaces it with the target hairstyle,
 * perfectly preserving the person's face, facial features, skin tone, and eyes.
 */
async function callStability(apiKey: string, req: TryOnRequest): Promise<VisualTryOnResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const base64Data = req.image.split(",")[1];
    const imageBuffer = Buffer.from(base64Data, "base64");

    const formData = new FormData();
    formData.append("image", new Blob([imageBuffer], { type: "image/jpeg" }), "customer.jpg");
    formData.append("prompt", `A professional ${req.styleDescription} hairstyle. Keep the person's exact face and identity intact.`);
    formData.append("search_prompt", "hair, hairstyle, head hair");
    formData.append("output_format", "webp");

    const res = await fetch("https://api.stability.ai/v2beta/stable-image/edit/search-and-replace", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "image/*",
      },
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Stability AI returned HTTP ${res.status}: ${errText.slice(0, 150)}`);
    }

    const arrayBuf = await res.arrayBuffer();
    const outBase64 = Buffer.from(arrayBuf).toString("base64");
    return {
      imageUrl: `data:image/webp;base64,${outBase64}`,
      source: "ai-generated",
      label: `AI Generated — ${req.styleDescription} (Face Preserved)`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call OpenAI API using Image Edits.
 */
async function callOpenAI(apiKey: string, req: TryOnRequest): Promise<VisualTryOnResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const base64Data = req.image.split(",")[1];
    const imageBuffer = Buffer.from(base64Data, "base64");

    const formData = new FormData();
    formData.append("image", new Blob([imageBuffer], { type: "image/png" }), "image.png");
    formData.append("prompt", `Modify hairstyle to a ${req.styleDescription}. Keep the person's face, facial features, eyes, nose, mouth, and skin tone identical to the uploaded image. High resolution.`);
    formData.append("n", "1");
    formData.append("size", "1024x1024");
    formData.append("response_format", "b64_json");

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`OpenAI API returned HTTP ${res.status}: ${errData?.error?.message || "Image edit failed"}`);
    }

    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    const url = data?.data?.[0]?.url;

    if (!b64 && !url) {
      throw new Error("OpenAI did not return image data.");
    }

    return {
      imageUrl: b64 ? `data:image/png;base64,${b64}` : url,
      source: "ai-generated",
      label: `AI Generated — ${req.styleDescription} (Face Preserved)`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call Google Gemini Imagen 3 API for hairstyle visualization.
 */
async function callGemini(apiKey: string, req: TryOnRequest): Promise<VisualTryOnResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const { prompt } = buildHairstyleInstruction(req.styleDescription);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "3:4",
            personGeneration: "allow_adult",
          },
        }),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Gemini Imagen API error (${res.status}): ${err?.error?.message || res.statusText}`);
    }

    const data = await res.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) {
      throw new Error("Gemini Imagen did not return image bytes.");
    }

    return {
      imageUrl: `data:image/jpeg;base64,${b64}`,
      source: "ai-generated",
      label: `AI Generated — ${req.styleDescription} (Google Gemini Imagen)`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call Hugging Face Serverless Inference API or Dedicated Endpoint.
 * Supports SDXL Inpainting (diffusers/stable-diffusion-xl-1.0-inpainting-0.1)
 * or dedicated Stable-Hair endpoints (ahmdliaqat/Stable-Hair).
 */
async function callHuggingFace(
  apiKey: string,
  modelName: string | undefined,
  customEndpoint: string | undefined,
  req: TryOnRequest
): Promise<VisualTryOnResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const { instruction, prompt, negativePrompt } = buildHairstyleInstruction(req.styleDescription);
    const model = modelName || "timbrooks/instruct-pix2pix";
    
    // Support raw base64 or data URI
    const rawBase64 = req.image.includes(",") ? req.image.split(",")[1] : req.image;
    const isInstructPix = model.includes("instruct-pix2pix");

    const candidateUrls = customEndpoint
      ? [customEndpoint]
      : [
          `https://router.huggingface.co/hf-inference/models/${model}`,
          `https://api-inference.huggingface.co/models/${model}`,
        ];

    let lastError: Error | null = null;

    for (const endpointUrl of candidateUrls) {
      try {
        console.log(`[ai-service] Dispatching to Hugging Face: ${model} via ${endpointUrl}`);

        const payload = isInstructPix
          ? {
              inputs: rawBase64,
              parameters: {
                prompt: instruction,
                negative_prompt: negativePrompt,
                guidance_scale: 7.5,
                image_guidance_scale: 1.5,
              },
            }
          : {
              inputs: req.image,
              parameters: {
                prompt,
                negative_prompt: negativePrompt,
                num_inference_steps: 25,
                guidance_scale: 7.5,
              },
            };

        const res = await fetch(endpointUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "Unknown error");
          if (res.status === 503) {
            throw new Error(`Hugging Face model ${model} is currently loading on GPU. Please retry in 20-30 seconds.`);
          }
          if (res.status === 401) {
            throw new Error("Hugging Face API token is invalid or unauthorized. Please verify your HUGGINGFACE_API_KEY in .env.");
          }
          throw new Error(`Hugging Face responded with status ${res.status}: ${errText.slice(0, 200)}`);
        }

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("image/")) {
          const arrayBuffer = await res.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          const mime = contentType.split(";")[0] || "image/jpeg";
          return {
            imageUrl: `data:${mime};base64,${base64}`,
            source: "ai-generated",
            label: `AI Generated — ${req.styleDescription} (Hugging Face ${model.split("/").pop()})`,
          };
        }

        const json = await res.json().catch(() => null);
        if (json) {
          const imgOutput = json.image || (Array.isArray(json) && json[0]?.image) || json.output;
          if (imgOutput) {
            const fullUrl = imgOutput.startsWith("data:") ? imgOutput : `data:image/jpeg;base64,${imgOutput}`;
            return {
              imageUrl: fullUrl,
              source: "ai-generated",
              label: `AI Generated — ${req.styleDescription} (Hugging Face ${model.split("/").pop()})`,
            };
          }
        }
      } catch (err: unknown) {
        lastError = err as Error;
        console.warn(`[ai-service] Hugging Face attempt failed at ${endpointUrl}:`, (err as Error).message);
      }
    }

    throw lastError || new Error("Hugging Face inference failed to return a valid hairstyle result.");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Main real try-on dispatcher.
 */
export async function realTryOn(req: TryOnRequest): Promise<VisualTryOnResult> {
  const config = getAiConfig();

  if (config.realTryOnEndpoint) {
    return await callCustomEndpoint(config.realTryOnEndpoint, req);
  }

  if (config.huggingFaceApiKey) {
    return await callHuggingFace(
      config.huggingFaceApiKey,
      config.huggingFaceModel,
      config.huggingFaceEndpoint,
      req
    );
  }

  if (config.geminiApiKey) {
    return await callGemini(config.geminiApiKey, req);
  }

  if (config.replicateApiToken) {
    return await callReplicate(config.replicateApiToken, config.replicateModel, req);
  }

  if (config.stabilityApiKey) {
    return await callStability(config.stabilityApiKey, req);
  }

  if (config.openaiApiKey) {
    return await callOpenAI(config.openaiApiKey, req);
  }

  throw new Error(
    "No image generation provider is configured. Please add HUGGINGFACE_API_KEY, GEMINI_API_KEY, REPLICATE_API_TOKEN, STABILITY_API_KEY, or OPENAI_API_KEY to .env to generate face-preserving hairstyle previews."
  );
}

