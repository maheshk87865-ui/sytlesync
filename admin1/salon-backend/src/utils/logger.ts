/**
 * Pino logger — structured logs with redaction of sensitive fields.
 */

import pino from "pino";
import { config } from "../config";

export const logger = pino({
  name: "stylesync-salon-backend",
  level: config.logLevel,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.passwordHash",
      "req.body.token",
      "req.body.refreshToken",
      "*.password",
      "*.passwordHash",
      "*.token",
    ],
    censor: "[redacted]",
  },
  transport: config.isDev
    ? { target: "pino-pretty", options: { colorize: true, singleLine: false } }
    : undefined,
});
