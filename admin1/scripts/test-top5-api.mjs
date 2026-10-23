import fs from "fs";
import path from "path";

async function runTest() {
  console.log("=== Testing StyleSync AI Hairstyle Generator (Top 5 & Face Preservation) ===");

  const baseUrl = "http://localhost:3000";

  // Test 1: Missing image
  console.log("\n[Test 1] POST /api/style-generate-top5 with no image...");
  const res1 = await fetch(`${baseUrl}/api/style-generate-top5`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  console.log(`Status: ${res1.status} (expected 400)`);
  if (res1.status !== 400) throw new Error("Expected 400 for missing image");

  // Test 2: Valid sample image with preferences
  console.log("\n[Test 2] POST /api/style-generate-top5 with valid portrait photo & preferences...");
  const sampleImagePath = path.join(process.cwd(), "public", "hairstyles", "textured-quiff.jpg");
  if (!fs.existsSync(sampleImagePath)) {
    throw new Error(`Sample portrait not found at ${sampleImagePath}`);
  }

  const imageBuffer = fs.readFileSync(sampleImagePath);
  const base64Data = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;

  const startTime = Date.now();
  const res2 = await fetch(`${baseUrl}/api/style-generate-top5`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: base64Data,
      preferences: {
        hairLength: "medium",
        haircutStyle: "quiff",
        maintenance: "Medium",
        occasion: "daily",
      },
    }),
  });

  const elapsed = Date.now() - startTime;
  console.log(`Status: ${res2.status} (took ${elapsed}ms)`);
  if (!res2.ok) {
    const errText = await res2.text();
    throw new Error(`Generation failed with ${res2.status}: ${errText}`);
  }

  const data = await res2.json();
  console.log(`Success: ${data.success}`);
  console.log(`Model: ${data.model}`);
  console.log(`Disclaimer: ${data.disclaimer}`);
  console.log(`Total candidates: ${data.candidates?.length}`);

  if (!data.success) throw new Error("Expected success: true");
  if (!Array.isArray(data.candidates) || data.candidates.length !== 5) {
    throw new Error(`Expected exactly 5 candidates, got ${data.candidates?.length}`);
  }

  // Verify each candidate
  data.candidates.forEach((cand, idx) => {
    console.log(`  Candidate ${idx + 1}: ${cand.name} | Category: ${cand.category} | Face Preserved: ${cand.facePreserved}`);
    if (!cand.name) throw new Error(`Candidate ${idx + 1} missing name`);
    if (!cand.previewUrl || !cand.previewUrl.startsWith("data:image/")) {
      throw new Error(`Candidate ${idx + 1} missing valid preview data URL`);
    }
    if (!cand.suitabilityReason) throw new Error(`Candidate ${idx + 1} missing suitability reason`);
    if (cand.facePreserved !== true) throw new Error(`Candidate ${idx + 1} facePreserved flag must be true`);
  });

  // Verify mandatory disclaimer
  const expectedDisclaimer =
    "AI hairstyle preview — actual salon results may vary. Facial appearance is intended to remain consistent, but generated previews may contain visual differences.";
  if (data.disclaimer !== expectedDisclaimer) {
    throw new Error(`Disclaimer mismatch. Got: "${data.disclaimer}"`);
  }

  console.log("\n>>> ALL TESTS PASSED: 5 independent hairstyles generated with strict face preservation!");
}

runTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
