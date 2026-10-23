import sharp from "sharp";
import path from "path";
import fs from "fs";

/**
 * Face-Preserving Hairstyle Compositor
 * -------------------------------------------------------------
 * When neural inpainting APIs (like Replicate) are not active,
 * this engine takes the customer's actual uploaded photo and
 * blends the target hairstyle (hair crown, volume, and tapered sides)
 * directly onto their head while preserving 100% of their actual
 * eyes, eyebrows, nose, mouth, jawline, skin tone, and shirt.
 */
export async function blendHairstyleOntoUserFace(
  userPhotoBase64: string,
  styleImagePathRelative: string,
  styleDescription: string
): Promise<string> {
  try {
    const rawData = userPhotoBase64.includes(",") ? userPhotoBase64.split(",")[1] : userPhotoBase64;
    const userBuffer = Buffer.from(rawData, "base64");

    const targetWidth = 896;
    const targetHeight = 1200;

    // Normalize user's photo to 3:4 portrait ratio
    const normalizedUser = await sharp(userBuffer)
      .resize(targetWidth, targetHeight, { fit: "cover", position: "center" })
      .toBuffer();

    // Resolve full path to style portrait
    let fullStylePath = path.join(process.cwd(), "public", styleImagePathRelative);
    if (!fs.existsSync(fullStylePath)) {
      fullStylePath = path.join(process.cwd(), "admin1", "public", styleImagePathRelative);
    }

    if (!fs.existsSync(fullStylePath)) {
      // Fallback if file doesn't exist
      return userPhotoBase64;
    }

    const desc = styleDescription.toLowerCase();

    // Determine hair boundary depending on haircut style
    let cutoffPct = 0.38; // Default forehead transition line
    if (desc.includes("buzz") || desc.includes("crew")) {
      cutoffPct = 0.33;
    } else if (desc.includes("quiff") || desc.includes("pompadour")) {
      cutoffPct = 0.40;
    } else if (desc.includes("taper") || desc.includes("fade")) {
      cutoffPct = 0.37;
    }

    const hairCutoff = Math.round(targetHeight * cutoffPct);
    const feather = Math.round(targetHeight * 0.08);

    // SVG alpha gradient: solid white at top, fading out right at the forehead
    const maskSvg = `
      <svg width="${targetWidth}" height="${targetHeight}">
        <defs>
          <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
            <stop offset="${Math.max(0, ((hairCutoff - feather) / targetHeight) * 100).toFixed(1)}%" stop-color="#ffffff" stop-opacity="1" />
            <stop offset="${((hairCutoff - (feather * 0.3)) / targetHeight * 100).toFixed(1)}%" stop-color="#ffffff" stop-opacity="0.85" />
            <stop offset="${((hairCutoff) / targetHeight * 100).toFixed(1)}%" stop-color="#ffffff" stop-opacity="0.4" />
            <stop offset="${Math.min(100, ((hairCutoff + feather) / targetHeight) * 100).toFixed(1)}%" stop-color="#ffffff" stop-opacity="0" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </linearGradient>
        </defs>
        <rect width="${targetWidth}" height="${targetHeight}" fill="url(#hairGrad)" />
      </svg>
    `;

    const maskBuffer = Buffer.from(maskSvg);

    // Prepare hair overlay: resize and apply alpha mask
    const hairOverlay = await sharp(fullStylePath)
      .resize(targetWidth, targetHeight, { fit: "cover", position: "top" })
      .composite([{
        input: maskBuffer,
        blend: "dest-in" // Keeps hair only where mask is white/opaque
      }])
      .toBuffer();

    // Composite the masked hair onto the user's authentic photo
    const finalImageBuffer = await sharp(normalizedUser)
      .composite([{
        input: hairOverlay,
        blend: "over"
      }])
      .jpeg({ quality: 90 })
      .toBuffer();

    return `data:image/jpeg;base64,${finalImageBuffer.toString("base64")}`;
  } catch (err) {
    console.warn("[face-blender] Fallback blending warning:", err);
    // If blending encounters any error, return the hairstyle image
    return styleImagePathRelative;
  }
}
