/**
 * Health check endpoint.
 * ------------------------------------------------------------
 * GET /api/v1/health
 * Returns:
 *   {
 *     success: true,
 *     status: "healthy" | "degraded" | "unhealthy",
 *     checks: { database: {...}, ai: {...}, payments: {...}, ... },
 *     timestamp: ISO
 *   }
 */

import { Router } from "express";
import { config } from "../config";
import { pingDatabase } from "../database";
import { sendSuccess } from "../utils/response";

export const router = Router();

async function health(_req: any, res: any, _next: any) {
  const checks: Record<string, any> = {
    database: { configured: config.isDatabaseConfigured },
    auth: { configured: config.isJwtConfigured },
    ai: { configured: config.isAiConfigured, label: config.aiModelLabel },
    payments: { configured: config.isPaymentConfigured },
    maps: { configured: config.isMapsConfigured },
  };

  // Verify DB reachability
  if (config.isDatabaseConfigured) {
    const ping = await pingDatabase();
    checks.database.reachable = ping.ok;
    checks.database.latencyMs = ping.latencyMs;
    if (ping.error) checks.database.error = ping.error;
  }

  // Overall status
  const dbOk = checks.database.configured && checks.database.reachable;
  const status = dbOk ? "healthy" : (config.isDatabaseConfigured ? "degraded" : "degraded");

  return sendSuccess(res, {
    status,
    checks,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  }, undefined, status === "healthy" ? 200 : 503);
}

router.get("/", health);

export default router;
