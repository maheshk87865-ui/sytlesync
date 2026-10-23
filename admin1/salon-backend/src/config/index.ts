/**
 * Backend config — loads env vars once at module load.
 * Single source of truth for all env-derived values.
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function required(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optional(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return v;
}

function optionalInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function optionalBool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (!v) return fallback;
  return v === "true" || v === "1";
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return value.startsWith("placeholder") || value.includes("change-me");
}

export const config = {
  nodeEnv: optional("NODE_ENV", "development") as string,
  isProd: optional("NODE_ENV", "development") === "production",
  isDev: optional("NODE_ENV", "development") !== "production",
  port: optionalInt("SALON_BACKEND_PORT", optionalInt("PORT", 4001)),

  databaseUrl: required("DATABASE_URL", "postgresql://stylesync:stylesync@localhost:5432/stylesync_salon"),
  isDatabaseConfigured: !isPlaceholder(process.env.DATABASE_URL),

  jwtSecret: required("JWT_SECRET", "salon-dev-jwt-secret-change-me"),
  jwtExpiresIn: optional("JWT_EXPIRES_IN", "7d") as string,
  jwtRefreshExpiresIn: optional("JWT_REFRESH_EXPIRES_IN", "30d") as string,
  isJwtConfigured: !isPlaceholder(process.env.JWT_SECRET),

  corsOrigin: optional("SALON_CORS_ORIGIN", optional("CORS_ORIGIN", "http://localhost:3000")) as string,
  corsOrigins: (optional("SALON_CORS_ORIGINS", optional("CORS_ORIGINS", "http://localhost:3000")) as string)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  rateLimitWindowMs: optionalInt("RATE_LIMIT_WINDOW_MS", 60_000),
  rateLimitMax: optionalInt("RATE_LIMIT_MAX", 100),

  maxFileSizeMb: optionalInt("MAX_FILE_SIZE_MB", 8),

  logLevel: optional("LOG_LEVEL", "info") as string,
} as const;

export type AppConfig = typeof config;
