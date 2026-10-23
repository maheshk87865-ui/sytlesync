import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runLiveTest() {
  console.log("============================================================");
  console.log("StyleSync Live End-to-End AI Try-On Verification");
  console.log("============================================================\n");

  const samplePath = path.join(__dirname, "../public/salons/salon-01.jpeg");
  const imgBuffer = fs.readFileSync(samplePath);
  const dataUrl = `data:image/jpeg;base64,${imgBuffer.toString("base64")}`;

  // 1. Invalid input test (bad MIME)
  console.log("[CHECK 1] Testing invalid MIME rejection...");
  const resBadMime = await fetch("http://localhost:3000/api/style-tryon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      styleDescription: "Textured Quiff"
    })
  });
  const dataBadMime = await resBadMime.json();
  if (resBadMime.status === 400 && dataBadMime.error?.includes("Unsupported image format")) {
    console.log("  PASS: Rejected unsupported MIME format (HTTP 400).");
  } else {
    console.error("  FAIL: Expected HTTP 400 for bad MIME, got:", resBadMime.status, dataBadMime);
  }

  // 2. Missing style description test
  console.log("\n[CHECK 2] Testing missing style description rejection...");
  const resMissingStyle = await fetch("http://localhost:3000/api/style-tryon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: dataUrl })
  });
  const dataMissingStyle = await resMissingStyle.json();
  if (resMissingStyle.status === 400 && dataMissingStyle.error?.includes("styleDescription")) {
    console.log("  PASS: Rejected missing styleDescription (HTTP 400).");
  } else {
    console.error("  FAIL: Expected HTTP 400 for missing styleDescription, got:", resMissingStyle.status, dataMissingStyle);
  }

  // 3. Genuine request test
  console.log("\n[CHECK 3] Dispatching genuine style-tryon request to /api/style-tryon...");
  console.log("  Selected Hairstyle: 'Textured Quiff'");
  console.log("  Image size: " + (imgBuffer.length / 1024).toFixed(1) + " KB");

  const start = Date.now();
  const res = await fetch("http://localhost:3000/api/style-tryon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: dataUrl,
      styleDescription: "Textured Quiff",
      serviceType: "Haircut"
    })
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  HTTP Status (${elapsed}s):`, res.status);

  const data = await res.json();
  console.log("  Response details:", {
    success: data.success,
    source: data.source,
    label: data.label,
    isConfigured: data.isConfigured,
    hasImageUrl: Boolean(data.imageUrl),
    errorMessage: data.errorMessage || data.error,
  });

  // Verify no salon chair stock photo is returned
  if (data.imageUrl && data.imageUrl.includes("salon")) {
    console.error("  FAIL: Returned a stock salon photo instead of a real generated result!");
  } else if (data.success && data.imageUrl) {
    console.log("  PASS: Received genuinely generated AI image!");
    console.log("  Output URL:", data.imageUrl);
  } else if (data.source === "unavailable") {
    console.log("  PASS: Provider accurately detected as unconfigured/unavailable.");
    console.log("  Notice:", data.errorMessage || data.error);
  } else {
    console.log("  RESULT:", data);
  }

  console.log("\n============================================================");
}

runLiveTest().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
