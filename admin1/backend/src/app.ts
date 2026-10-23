/**
 * Express app setup.
 * ------------------------------------------------------------
 * Wires up all middleware (helmet, cors, rate-limit, request logger,
 * body parsers, JSON error handler) and mounts the /api/v1 routes.
 */

import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { config } from "./config";
import { apiV1Router } from "./routes";
import { notFound } from "./middleware/not-found";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger } from "./middleware/request-logger";
import { apiLimiter } from "./middleware/rate-limiter";

export function createApp(): Express {
  const app = express();

  // ─── Security headers ──────────────────────────────────────────
  app.use(helmet());

  // ─── CORS ───────────────────────────────────────────────────────
  app.use(cors({
    origin: config.corsOrigins.length ? config.corsOrigins : config.corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
  }));

  // ─── Compression ───────────────────────────────────────────────
  app.use(compression());

  // ─── Body parsers ─────────────────────────────────────────────
  // Limit body size to protect against large payload attacks.
  // File uploads are handled separately by multer.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // ─── Request logger (Pino) ─────────────────────────────────────
  app.use(requestLogger);

  // ─── Global rate limiter ───────────────────────────────────────
  app.use("/api/v1", apiLimiter);

  // ─── API routes ────────────────────────────────────────────────
  app.use("/api/v1", apiV1Router);

  // Root — quick "yes the server is up" indicator
  app.get("/", (_req, res) => {
    res.json({
      name: "StyleSync Customer Backend",
      version: "1.0.0",
      apiBase: "/api/v1",
      health: "/api/v1/health",
      timestamp: new Date().toISOString(),
    });
  });

  // ─── 404 + Error handler (must be last) ──────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
