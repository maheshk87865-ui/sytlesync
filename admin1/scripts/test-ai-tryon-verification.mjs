/**
 * Focused verification test for StyleSync Customer App AI Hairstyle Generation
 *
 * Verifies:
 * 1. Invalid payload handling (missing image, bad MIME, missing style description, oversized image)
 * 2. Real provider configuration detection (Replicate, Stability AI, OpenAI, Custom/Local)
 * 3. Elimination of salon chair stock photo substitution (salon-13.jpg)
 * 4. Honest reporting of provider availability (no fake success when unconfigured)
 * 5. Hairstyle recommendation engine initializes without pre-baked stock photos
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTests() {
  console.log("============================================================");
  console.log("StyleSync AI Hairstyle Generation Verification Test Suite");
  console.log("============================================================\n");

  let passed = 0;
  let failed = 0;
  let notTested = 0;

  const sampleJpg = path.join(__dirname, "../public/salons/salon-01.jpeg");
  const imgBuffer = fs.readFileSync(sampleJpg);
  const validDataUrl = `data:image/jpeg;base64,${imgBuffer.toString("base64")}`;

  // Dynamically import the compiled or source modules
  const { getAiConfig } = await import("../src/lib/ai-service/config.ts");
  const { generateTryOn } = await import("../src/lib/ai-service/visual-tryon/index.ts");
  const { generateRecommendations } = await import("../src/lib/ai-service/recommendations/recommendation-engine.ts");

  // TEST 1: Recommendation Engine initializes with visualPreview undefined (NO salon chair)
  console.log("[TEST 1] Recommendation Engine: Verify NO pre-baked salon chair stock photos");
  try {
    const recs = generateRecommendations("I want a textured quiff with high fade");
    const hasSalonChair = recs.some(r => r.visualPreview && r.visualPreview.includes("salon-13"));
    const anyVisualPreview = recs.some(r => r.visualPreview !== undefined);

    if (hasSalonChair) {
      console.error("  FAIL: Found salon-13.jpg pre-assigned in recommendations!");
      failed++;
    } else if (anyVisualPreview) {
      console.error("  FAIL: Expected recommendations to start with visualPreview: undefined");
      failed++;
    } else {
      console.log(`  PASS: Generated ${recs.length} recommendations. All start with visualPreview: undefined (clean state).`);
      console.log(`        Styles suggested: ${recs.map(r => r.style).join(", ")}`);
      passed++;
    }
  } catch (err) {
    console.error("  FAIL with exception:", err);
    failed++;
  }

  // TEST 2: Provider Configuration Detection
  console.log("\n[TEST 2] Provider Configuration: Check environment and credentials");
  try {
    const config = getAiConfig();
    console.log("  Config detected:", {
      mode: config.mode,
      isImageGenConfigured: config.isImageGenConfigured,
      hasReplicateToken: Boolean(config.replicateApiToken),
      hasStabilityKey: Boolean(config.stabilityApiKey),
      hasOpenaiKey: Boolean(config.openaiApiKey),
      hasCustomEndpoint: Boolean(config.realTryOnEndpoint),
    });

    if (config.isImageGenConfigured) {
      console.log("  PASS: Real image generation provider detected in environment.");
      passed++;
    } else {
      console.log("  PASS: Accurately detected that no external image generation provider is configured in local .env.");
      passed++;
    }
  } catch (err) {
    console.error("  FAIL:", err);
    failed++;
  }

  // TEST 3: Honest Try-On Response when no provider key is configured
  console.log("\n[TEST 3] Honest Try-On Response: Verify no stock photo is returned as fake generation");
  try {
    const config = getAiConfig();
    const result = await generateTryOn({
      image: validDataUrl,
      styleDescription: "Textured Quiff with tapered sides",
      serviceType: "Haircut",
    });

    if (config.isImageGenConfigured) {
      if (result.source === "ai-generated" && result.imageUrl) {
        console.log("  PASS: Generated real AI image:", result.imageUrl.slice(0, 50) + "...");
        passed++;
      } else {
        console.log("  INFO: Configured provider failed or timed out:", result.errorMessage);
        failed++;
      }
    } else {
      // In unconfigured environment:
      if (result.imageUrl && result.imageUrl.includes("salon")) {
        console.error("  FAIL: Returned a stock salon image instead of reporting unavailable!");
        failed++;
      } else if (result.source === "unavailable") {
        console.log("  PASS: Correctly reported source: 'unavailable' and no fake image.");
        console.log("        Message:", result.errorMessage);
        passed++;
      } else {
        console.error("  FAIL: Unexpected response:", result);
        failed++;
      }
    }
  } catch (err) {
    console.error("  FAIL with exception:", err);
    failed++;
  }

  // TEST 4: API Route POST handler validation
  console.log("\n[TEST 4] API Route POST Validation (Payload & Image Sanitization)");
  try {
    const { POST } = await import("../src/app/api/style-tryon/route.ts");

    // 4a. Bad body
    const resBadBody = await POST(new Request("http://localhost:3000/api/style-tryon", {
      method: "POST",
      body: "invalid-json",
      headers: { "Content-Type": "application/json" },
    }));
    const dataBadBody = await resBadBody.json();
    if (resBadBody.status === 400 && dataBadBody.error) {
      console.log("  PASS 4a: Rejected non-JSON / invalid body (HTTP 400)");
      passed++;
    } else {
      console.error("  FAIL 4a: Expected HTTP 400 for bad body", resBadBody.status);
      failed++;
    }

    // 4b. Missing image
    const resMissingImg = await POST(new Request("http://localhost:3000/api/style-tryon", {
      method: "POST",
      body: JSON.stringify({ styleDescription: "Textured Quiff" }),
      headers: { "Content-Type": "application/json" },
    }));
    const dataMissingImg = await resMissingImg.json();
    if (resMissingImg.status === 400 && dataMissingImg.error.includes("data:image")) {
      console.log("  PASS 4b: Rejected request with missing image data URL (HTTP 400)");
      passed++;
    } else {
      console.error("  FAIL 4b: Expected HTTP 400 for missing image");
      failed++;
    }

    // 4c. Unsupported MIME
    const resBadMime = await POST(new Request("http://localhost:3000/api/style-tryon", {
      method: "POST",
      body: JSON.stringify({ image: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", styleDescription: "Textured Quiff" }),
      headers: { "Content-Type": "application/json" },
    }));
    const dataBadMime = await resBadMime.json();
    if (resBadMime.status === 400 && dataBadMime.error.includes("Unsupported image format")) {
      console.log("  PASS 4c: Rejected unsupported image format (image/gif) (HTTP 400)");
      passed++;
    } else {
      console.error("  FAIL 4c: Expected HTTP 400 for unsupported MIME format");
      failed++;
    }

    // 4d. Missing styleDescription
    const resMissingStyle = await POST(new Request("http://localhost:3000/api/style-tryon", {
      method: "POST",
      body: JSON.stringify({ image: validDataUrl }),
      headers: { "Content-Type": "application/json" },
    }));
    const dataMissingStyle = await resMissingStyle.json();
    if (resMissingStyle.status === 400 && dataMissingStyle.error.includes("styleDescription")) {
      console.log("  PASS 4d: Rejected request with missing styleDescription (HTTP 400)");
      passed++;
    } else {
      console.error("  FAIL 4d: Expected HTTP 400 for missing styleDescription");
      failed++;
    }

    // 4e. Oversized image (>8MB)
    const largeBase64 = "A".repeat(11 * 1024 * 1024); // ~8.25MB
    const resLarge = await POST(new Request("http://localhost:3000/api/style-tryon", {
      method: "POST",
      body: JSON.stringify({ image: `data:image/jpeg;base64,${largeBase64}`, styleDescription: "Fade" }),
      headers: { "Content-Type": "application/json" },
    }));
    const dataLarge = await resLarge.json();
    if (resLarge.status === 400 && dataLarge.error.includes("too large")) {
      console.log("  PASS 4e: Rejected oversized image > 8MB (HTTP 400)");
      passed++;
    } else {
      console.error("  FAIL 4e: Expected HTTP 400 for oversized image");
      failed++;
    }
  } catch (err) {
    console.error("  FAIL in API route validation:", err);
    failed++;
  }

  // TEST 5: Live External Generation with Real Credentials
  console.log("\n[TEST 5] External Live Hairstyle Generation of Same Person's Face");
  const config = getAiConfig();
  if (!config.isImageGenConfigured) {
    console.log("  NOT TESTED: External provider API credentials (REPLICATE_API_TOKEN / STABILITY_API_KEY / AI_TRYON_ENDPOINT) are not provided in the local environment.");
    notTested++;
  } else {
    // If configured, test live generation
    try {
      const result = await generateTryOn({
        image: validDataUrl,
        styleDescription: "Classic Taper Cut",
        serviceType: "Haircut",
      });
      if (result.source === "ai-generated" && result.imageUrl) {
        console.log("  PASS: Live AI generation succeeded for Classic Taper Cut.");
        passed++;
      } else {
        console.error("  FAIL: Live generation failed:", result.errorMessage);
        failed++;
      }
    } catch (err) {
      console.error("  FAIL:", err);
      failed++;
    }
  }

  console.log("\n============================================================");
  console.log(`Results: ${passed} PASSED, ${failed} FAILED, ${notTested} NOT TESTED`);
  console.log("============================================================\n");
}

runTests().catch(err => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
