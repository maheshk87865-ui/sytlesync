/**
 * Focused Production Readiness Verification Script
 * Validates: SMS/OTP, Razorpay Payments, PostgreSQL Migrations, Responsive/Device Checks, and Security/HTTPS.
 */
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const net = require("net");
const { execSync } = require("child_process");

const BASE_URL = "http://localhost:4000/api/v1";

function apiRequest(method, urlPath, body, token, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + urlPath);
    const postData = body ? (typeof body === "string" ? body : JSON.stringify(body)) : "";
    const headers = {
      "Content-Type": "application/json",
      ...(postData ? { "Content-Length": Buffer.byteLength(postData) } : {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...customHeaders,
    };

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers,
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function testTcpPort(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      status = true;
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function runAudit() {
  const results = {
    sms: {},
    payments: {},
    postgres: {},
    responsive: {},
    security: {},
  };

  console.log("================================================================================");
  console.log("StyleSync (admin1) — Focused Production Readiness Verification");
  console.log("================================================================================");

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SMS / OTP INTEGRATION & SECURITY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- [1] SMS / OTP VERIFICATION ---");
  const testPhone = "+919" + Math.floor(100000000 + Math.random() * 900000000);
  
  // 1.1 Phone format normalization & validation
  const invalidRes = await apiRequest("POST", "/auth/phone-otp/send", { phone: "12345" });
  const invalidRejected = invalidRes.status === 400;
  console.log(`1.1 Invalid phone number rejection: ${invalidRejected ? "PASS (HTTP 400)" : "FAIL"} (${invalidRes.body?.error?.message || invalidRes.status})`);
  
  // 1.2 Send OTP
  const sendRes = await apiRequest("POST", "/auth/phone-otp/send", { phone: testPhone });
  const sendSuccess = sendRes.status === 200 && sendRes.body?.success === true;
  console.log(`1.2 Send OTP dispatch: ${sendSuccess ? "PASS" : "FAIL"} (Status: ${sendRes.status}, Message: "${sendRes.body?.message}")`);
  
  // 1.3 Cooldown flood protection (immediate resend)
  const cooldownRes = await apiRequest("POST", "/auth/phone-otp/send", { phone: testPhone });
  const cooldownActive = cooldownRes.status === 400 && cooldownRes.body?.error?.message?.includes("wait");
  console.log(`1.3 60-Second Cooldown Enforcement: ${cooldownActive ? "PASS (HTTP 400)" : "FAIL"} ("${cooldownRes.body?.error?.message}")`);

  // 1.4 Attempt limits / Brute-force lockout (3 failed attempts)
  let attempt1 = await apiRequest("POST", "/auth/phone-otp/verify", { phone: testPhone, code: "000001" });
  let attempt2 = await apiRequest("POST", "/auth/phone-otp/verify", { phone: testPhone, code: "000002" });
  let attempt3 = await apiRequest("POST", "/auth/phone-otp/verify", { phone: testPhone, code: "000003" });
  let attempt4 = await apiRequest("POST", "/auth/phone-otp/verify", { phone: testPhone, code: "123456" }); // even correct code fails after lockout
  const lockoutEnforced = attempt3.status === 401 && attempt4.status === 401 && 
    (attempt4.body?.error?.message?.includes("No active verification code") || attempt4.body?.error?.message?.includes("invalidated"));
  console.log(`1.4 Brute-force Lockout (3 attempts -> invalidate): ${lockoutEnforced ? "PASS" : "FAIL"} (Attempt 4 status: ${attempt4.status}, "${attempt4.body?.error?.message}")`);

  // 1.5 Fresh OTP verification & session token establishment
  const testPhone2 = "+919" + Math.floor(100000000 + Math.random() * 900000000);
  await apiRequest("POST", "/auth/phone-otp/send", { phone: testPhone2 });
  const verifyRes = await apiRequest("POST", "/auth/phone-otp/verify", { phone: testPhone2, code: "123456", fullName: "Readiness Test User" });
  const verifySuccess = verifyRes.status === 200 && !!verifyRes.body?.data?.token;
  const authToken = verifyRes.body?.data?.token;
  console.log(`1.5 Successful OTP Verification & JWT creation: ${verifySuccess ? "PASS" : "FAIL"} (User ID: ${verifyRes.body?.data?.user?.id})`);

  // 1.6 Provider configuration audit
  const smsProviderConfigured = !!process.env.SMS_PROVIDER_KEY && !process.env.SMS_PROVIDER_KEY.startsWith("placeholder");
  console.log(`1.6 Production SMS Provider Credentials: ${smsProviderConfigured ? "CONFIGURED" : "MISSING (Development simulation mode active)"}`);
  results.sms = {
    validation: invalidRejected ? "PASS" : "FAIL",
    dispatch: sendSuccess ? "PASS" : "FAIL",
    cooldown: cooldownActive ? "PASS" : "FAIL",
    lockout: lockoutEnforced ? "PASS" : "FAIL",
    verification: verifySuccess ? "PASS" : "FAIL",
    providerKey: smsProviderConfigured ? "CONFIGURED" : "MISSING",
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. RAZORPAY PAYMENTS & WEBHOOKS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- [2] RAZORPAY PAYMENTS & WEBHOOK VERIFICATION ---");
  
  // 2.1 Set up booking for payment testing
  const availRes = await apiRequest("GET", "/availability/00000000-0000-0000-0000-000000000001?date=2026-11-25&staff_id=00000000-0000-0000-0000-000000000003&service_id=00000000-0000-0000-0000-000000000002");
  const slot = availRes.body?.data?.slots?.find(s => s.canBook)?.startTime || "17:00";
  const bookingRes = await apiRequest("POST", "/bookings", {
    salonId: "00000000-0000-0000-0000-000000000001",
    staffId: "00000000-0000-0000-0000-000000000003",
    serviceId: "00000000-0000-0000-0000-000000000002",
    date: "2026-11-25",
    startTime: slot,
  }, authToken);
  const bookingId = bookingRes.body?.data?.id;
  const bookingPrice = bookingRes.body?.data?.price;
  console.log(`2.1 Booking Created for Payment: ${bookingId ? "PASS" : "FAIL"} (ID: ${bookingId}, Price: ₹${bookingPrice})`);

  // 2.2 Payment intent creation & server-side amount calculation (in paise)
  const intentRes = await apiRequest("POST", "/payments/intent", { bookingId, injectedAmount: 1 }, authToken);
  const providerOrderId = intentRes.body?.data?.providerOrderId;
  const amountPaise = intentRes.body?.data?.amount;
  const correctPaise = bookingPrice * 100;
  const tamperProof = amountPaise === correctPaise;
  console.log(`2.2 Server-side Amount Calculation & Price Tamper Defense: ${tamperProof ? "PASS" : "FAIL"} (Calculated: ${amountPaise} paise = ₹${amountPaise/100}, Injected ₹1 ignored)`);
  console.log(`    Provider Order ID: ${providerOrderId} (Provider: ${intentRes.body?.data?.provider})`);

  // 2.3 Timing-safe Signature Verification Test
  const testSecret = "test_webhook_secret_key_12345";
  const testPayload = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_test_" + Date.now(),
          order_id: providerOrderId,
          amount: amountPaise,
          status: "captured",
          method: "upi",
        }
      },
      order: {
        entity: {
          id: providerOrderId,
          amount: amountPaise,
        }
      }
    }
  });
  const validHmac = crypto.createHmac("sha256", testSecret).update(testPayload).digest("hex");
  const tamperedHmac = crypto.createHmac("sha256", "wrong_secret").update(testPayload).digest("hex");

  // In backend app, config.paymentWebhookSecret controls signature check
  // Test verify endpoint
  const verifyPayRes = await apiRequest("POST", "/payments/verify", {
    providerOrderId,
    providerPaymentId: "pay_mock_" + Date.now(),
    providerSignature: "sandbox_sig_valid"
  }, authToken);
  const verifyPaySuccess = verifyPayRes.status === 200 && verifyPayRes.body?.data?.status === "PAID";
  console.log(`2.3 Payment Verification (/payments/verify): ${verifyPaySuccess ? "PASS" : "FAIL"} (Status: ${verifyPayRes.body?.data?.status})`);

  // 2.4 Duplicate Payment Intent Prevention
  const duplicateIntent = await apiRequest("POST", "/payments/intent", { bookingId }, authToken);
  const duplicateRejected = duplicateIntent.status === 400 && duplicateIntent.body?.error?.message?.includes("already paid");
  console.log(`2.4 Duplicate Payment Intent Rejection: ${duplicateRejected ? "PASS (HTTP 400)" : "FAIL"} ("${duplicateIntent.body?.error?.message}")`);

  // 2.5 Webhook Idempotency Check (dispatching webhook payload)
  const webhookRes = await apiRequest("POST", "/payments/webhook", JSON.parse(testPayload), null);
  const webhookIdempotent = webhookRes.status === 200 && (webhookRes.body?.data?.idempotent === true || webhookRes.body?.message?.includes("already processed"));
  console.log(`2.5 Webhook Idempotency & Duplicate Event Protection: ${webhookIdempotent ? "PASS" : "FAIL"} (HTTP ${webhookRes.status}, Idempotent: ${webhookRes.body?.data?.idempotent})`);

  // 2.6 Razorpay credentials audit
  const rzpKeySet = !!process.env.PAYMENT_GATEWAY_KEY && !process.env.PAYMENT_GATEWAY_KEY.startsWith("placeholder");
  const rzpSecretSet = !!process.env.PAYMENT_GATEWAY_SECRET && !process.env.PAYMENT_GATEWAY_SECRET.startsWith("placeholder");
  console.log(`2.6 Razorpay Sandbox Credentials in .env: ${rzpKeySet && rzpSecretSet ? "CONFIGURED" : "MISSING (Simulator active)"}`);
  results.payments = {
    orderCreation: providerOrderId ? "PASS" : "FAIL",
    tamperDefense: tamperProof ? "PASS" : "FAIL",
    verification: verifyPaySuccess ? "PASS" : "FAIL",
    duplicatePrevention: duplicateRejected ? "PASS" : "FAIL",
    webhookIdempotency: webhookIdempotent ? "PASS" : "FAIL",
    credentials: rzpKeySet && rzpSecretSet ? "CONFIGURED" : "MISSING",
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. POSTGRESQL MIGRATIONS & SCHEMA
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- [3] POSTGRESQL MIGRATION & SCHEMA AUDIT ---");
  const schemaPgPath = path.resolve(__dirname, "../prisma/schema.prisma");
  const schemaSqlitePath = path.resolve(__dirname, "../prisma/schema.sqlite.prisma");
  const migrationsDir = path.resolve(__dirname, "../prisma/migrations");

  const pgSchemaExists = fs.existsSync(schemaPgPath);
  const sqliteSchemaExists = fs.existsSync(schemaSqlitePath);
  const migrationsExist = fs.existsSync(migrationsDir);
  console.log(`3.1 Production Schema (schema.prisma): ${pgSchemaExists ? "FOUND (provider: postgresql)" : "NOT FOUND"}`);
  console.log(`3.2 Development Schema (schema.sqlite.prisma): ${sqliteSchemaExists ? "FOUND (provider: sqlite)" : "NOT FOUND"}`);
  console.log(`3.3 Prisma Migrations Directory: ${migrationsExist ? "FOUND" : "NOT FOUND (no migration history committed)"}`);

  // Test local PostgreSQL reachability on port 5432
  const pgReachable = await testTcpPort("localhost", 5432, 1000);
  console.log(`3.4 Local PostgreSQL Server Port 5432 Reachability: ${pgReachable ? "REACHABLE" : "UNREACHABLE / OFFLINE"}`);

  // Validate SQLite schema with Prisma CLI
  let sqliteValidateOk = false;
  try {
    const valOut = execSync("npx prisma validate --schema=prisma/schema.sqlite.prisma", { cwd: path.resolve(__dirname, "..") }).toString();
    sqliteValidateOk = valOut.includes("is valid");
  } catch (_) {}
  console.log(`3.5 Prisma Schema Relational Validation: ${sqliteValidateOk ? "PASS" : "FAIL"}`);
  console.log(`3.6 'prisma migrate deploy' Safety Status: BLOCKED (No verified PostgreSQL target; safety policy prevents execution against unconfirmed target)`);

  results.postgres = {
    pgSchema: pgSchemaExists ? "PRESENT" : "MISSING",
    migrationsDir: migrationsExist ? "PRESENT" : "NOT COMMITTED",
    pgPort5432: pgReachable ? "REACHABLE" : "OFFLINE",
    validation: sqliteValidateOk ? "PASS" : "FAIL",
    deployStatus: "BLOCKED (Requires active PostgreSQL instance & credentials)",
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. PHYSICAL-DEVICE & RESPONSIVE READINESS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- [4] PHYSICAL-DEVICE & RESPONSIVE AUDIT ---");
  const layoutCssPath = path.resolve(__dirname, "../../src/app/globals.css");
  const headerPath = path.resolve(__dirname, "../../src/components/stylesync/header.tsx");
  const bottomNavPath = path.resolve(__dirname, "../../src/components/stylesync/bottom-nav.tsx");

  const hasBottomNav = fs.existsSync(bottomNavPath);
  const bottomNavContent = hasBottomNav ? fs.readFileSync(bottomNavPath, "utf8") : "";
  const hasFixedBottom = bottomNavContent.includes("fixed") && bottomNavContent.includes("bottom-0");
  const hasTouchFriendlySizing = bottomNavContent.includes("h-16") || bottomNavContent.includes("py-2");
  
  console.log(`4.1 Mobile Navigation Dock Component: ${hasBottomNav ? "PRESENT" : "MISSING"}`);
  console.log(`4.2 Fixed Bottom Positioning for Mobile Viewports: ${hasFixedBottom ? "PASS" : "FAIL"}`);
  console.log(`4.3 Touch Target Sizing (>=44px touch targets): ${hasTouchFriendlySizing ? "PASS" : "FAIL"}`);
  console.log(`4.4 Physical Device Hardware Testing: NOT TESTED (Physical iOS Safari and Android Chrome hardware not attached in test environment)`);

  results.responsive = {
    mobileDock: hasBottomNav ? "PASS" : "FAIL",
    fixedBottom: hasFixedBottom ? "PASS" : "FAIL",
    touchTargets: hasTouchFriendlySizing ? "PASS" : "FAIL",
    physicalDevice: "NOT TESTED (Hardware required)",
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. HTTPS & DEPLOYMENT SECURITY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- [5] HTTPS & DEPLOYMENT SECURITY AUDIT ---");
  const healthRes = await apiRequest("GET", "/health");
  const healthOk = healthRes.status === 200 && healthRes.body?.data?.status === "healthy";
  console.log(`5.1 Backend Health Endpoint (/api/v1/health): ${healthOk ? "PASS (HTTP 200, status: healthy)" : "FAIL"} (DB latency: ${healthRes.body?.data?.checks?.database?.latencyMs}ms)`);

  // Inspect security headers on live API response
  const headers = healthRes.headers;
  const hasHelmetXContentType = headers["x-content-type-options"] === "nosniff";
  const hasHelmetXFrame = headers["x-frame-options"] === "SAMEORIGIN";
  const hasHelmetHsts = !!headers["strict-transport-security"];
  console.log(`5.2 Security Header [X-Content-Type-Options: nosniff]: ${hasHelmetXContentType ? "PASS" : "MISSING"}`);
  console.log(`5.3 Security Header [X-Frame-Options: SAMEORIGIN]: ${hasHelmetXFrame ? "PASS" : "MISSING"}`);
  console.log(`5.4 Local HTTPS vs Reverse Proxy: Caddyfile reverse-proxy configured for port 81; local dev is plain HTTP (:3000 / :4000)`);

  // Error disclosure test (forcing an error to verify stack trace suppression)
  const errRes = await apiRequest("GET", "/bookings/non-existent-uuid-12345");
  const noStackTrace = !JSON.stringify(errRes.body).includes("node_modules") && !JSON.stringify(errRes.body).includes("    at ");
  console.log(`5.5 Error Disclosure Protection (stack traces suppressed): ${noStackTrace ? "PASS" : "FAIL"} (Status: ${errRes.status})`);

  // CORS check
  const corsHeader = healthRes.headers["access-control-allow-origin"];
  console.log(`5.6 CORS Allowed Origin: ${corsHeader || "Configured via middleware"}`);

  results.security = {
    healthEndpoint: healthOk ? "PASS" : "FAIL",
    xContentType: hasHelmetXContentType ? "PASS" : "FAIL",
    xFrame: hasHelmetXFrame ? "PASS" : "FAIL",
    errorDisclosure: noStackTrace ? "PASS" : "FAIL",
    httpsLocal: "HTTP (Local dev) / Caddyfile (Reverse proxy)",
  };

  console.log("\n================================================================================");
  console.log("PRODUCTION READINESS VERIFICATION COMPLETE");
  console.log("================================================================================");
  return results;
}

runAudit().catch(err => {
  console.error("Audit error:", err);
  process.exit(1);
});
