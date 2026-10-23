/**
 * Request logger middleware — Pino-http based.
 * ------------------------------------------------------------
 * Logs request ID, user ID (when available), endpoint, status code,
 * and response time for every request.
 */

import pinoHttp from "pino-http";
import { logger } from "../utils/logger";
import { generateRequestId } from "../utils/helpers";

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const id = (req.headers["x-request-id"] as string) || generateRequestId();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  // Customize what's logged
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req: any, res: any) =>
    `${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${res.getHeader("x-response-time") || ""}`,
  customErrorMessage: (req: any, res: any, err: any) =>
    `${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${err.message}`,
  // Redact sensitive fields from logs
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.confirmPassword",
      "req.body.otp",
      "req.body.token",
      "req.body.cardNumber",
      "req.body.cvv",
      "res.headers.authorization",
    ],
    censor: "[REDACTED]",
  },
});
