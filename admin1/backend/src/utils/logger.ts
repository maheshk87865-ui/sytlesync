/**
 * Structured logging — Pino-based.
 * ------------------------------------------------------------
 * Logs request ID, user ID, endpoint, status code, response time,
 * and errors. NEVER logs passwords, payment secrets, auth tokens,
 * or sensitive personal information — Pino's redaction paths filter
 * those out at the transport level.
 */

import pino from "pino";
import { config } from "../config";

export const logger = pino({
  level: config.logLevel,
  redact: {
    paths: [
      // Auth
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.confirmPassword",
      "req.body.otp",
      "req.body.token",
      "req.body.refreshToken",
      "res.headers.authorization",
      // Payments
      "req.body.cardNumber",
      "req.body.cvv",
      "req.body.cvc",
      "req.body.upiPin",
      "req.body.paymentGatewayKey",
      "req.body.paymentGatewaySecret",
      "req.body.providerToken",
      // Personal info
      "req.body.email",
      "req.body.mobile",
      "req.body.phone",
      "*.email",
      "*.mobile",
      "*.password",
      "*.token",
      "*.cvv",
    ],
    censor: "[REDACTED]",
  },
  base: { service: "stylesync-customer-backend" },
  ...(config.isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
        },
      }
    : {}),
});

export type Logger = typeof logger;
