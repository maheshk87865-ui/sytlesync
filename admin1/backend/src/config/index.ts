/**
 * Backend config — loads env vars once at module load.
 * ------------------------------------------------------------
 * All env vars are read here. No other file should call
 * `process.env` directly — this is the single source of truth.
 */

import dotenv from "dotenv";
import path from "path";

// Load .env from the backend/ root
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
  port: optionalInt("PORT", 4000),

  // Database
  databaseUrl: required("DATABASE_URL", "postgresql://stylesync:stylesync@localhost:5432/stylesync_customer"),
  isDatabaseConfigured: !isPlaceholder(process.env.DATABASE_URL),

  // Supabase (optional alternative backend)
  supabaseUrl: optional("SUPABASE_URL"),
  supabaseAnonKey: optional("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY"),

  // JWT auth
  jwtSecret: required("JWT_SECRET", "dev-only-jwt-secret-change-me-in-production"),
  jwtExpiresIn: optional("JWT_EXPIRES_IN", "7d") as string,
  jwtRefreshExpiresIn: optional("JWT_REFRESH_EXPIRES_IN", "30d") as string,
  isJwtConfigured: !isPlaceholder(process.env.JWT_SECRET),

  // CORS
  corsOrigin: optional("CORS_ORIGIN", "http://localhost:3000") as string,
  corsOrigins: (optional("CORS_ORIGINS", "http://localhost:3000") as string)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // Payments
  paymentGatewayKey: optional("PAYMENT_GATEWAY_KEY"),
  paymentGatewaySecret: optional("PAYMENT_GATEWAY_SECRET"),
  paymentWebhookSecret: optional("PAYMENT_GATEWAY_WEBHOOK_SECRET"),
  isPaymentConfigured:
    !isPlaceholder(process.env.PAYMENT_GATEWAY_KEY) &&
    !isPlaceholder(process.env.PAYMENT_GATEWAY_SECRET),

  // Storage
  storageBucket: optional("STORAGE_BUCKET", "stylesync-customer"),

  // AI
  aiProviderUrl: optional("AI_PROVIDER_URL"),
  aiProviderKey: optional("AI_PROVIDER_KEY"),
  aiModelLabel: optional("AI_MODEL_LABEL", "Qwen2.5-VL (open-source)"),
  isAiConfigured: !isPlaceholder(process.env.AI_PROVIDER_URL),

  // Maps
  mapsApiKey: optional("MAPS_API_KEY"),
  isMapsConfigured: !isPlaceholder(process.env.MAPS_API_KEY),

  // Notifications
  notificationProviderKey: optional("NOTIFICATION_PROVIDER_KEY"),

  // Rate limiting
  rateLimitWindowMs: optionalInt("RATE_LIMIT_WINDOW_MS", 60_000),
  rateLimitMax: optionalInt("RATE_LIMIT_MAX", 100),

  // Uploads
  maxFileSizeMb: optionalInt("MAX_FILE_SIZE_MB", 8),

  // Logging
  logLevel: optional("LOG_LEVEL", "info") as string,
} as const;

export type AppConfig = typeof config;
